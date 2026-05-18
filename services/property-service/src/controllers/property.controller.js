'use strict';

const { validationResult } = require('express-validator');
const { v4: uuidv4 }        = require('uuid');
const { PrismaClient }      = require('@prisma/client');
const { minioClient, BUCKET } = require('../utils/minio.utils');
const { publishEvent }      = require('../utils/rabbitmq.utils');

const prisma = new PrismaClient();

/** Sends a 422 with field-level errors from express-validator. */
function sendValidationError(res, errors) {
  return res.status(422).json({ success: false, errors: errors.array() });
}

/** Builds a plain-object property response, stripping internal fields. */
function formatProperty(p) {
  return { ...p };
}

/**
 * GET /api/properties
 * Returns a paginated list of available properties.
 */
async function listProperties(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const page  = parseInt(req.query.page  ?? '1',  10);
  const limit = parseInt(req.query.limit ?? '20', 10);
  const [sortField, sortDir = 'desc'] = (req.query.sort ?? 'createdAt:desc').split(':');

  try {
    const [properties, total] = await prisma.$transaction([
      prisma.property.findMany({
        where:   { status: 'available' },
        include: { images: { take: 1 }, agent: { select: { id: true, name: true } } },
        orderBy: { [sortField]: sortDir },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.property.count({ where: { status: 'available' } }),
    ]);

    return res.json({
      success: true,
      data:       properties.map(formatProperty),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[property] listProperties error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
}

/**
 * GET /api/properties/:id
 * Returns a single property with all images and agent info.
 */
async function getProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const property = await prisma.property.findUnique({
      where:   { id: req.params.id },
      include: { images: true, agent: { select: { id: true, name: true, phone: true, avatar: true } } },
    });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    await prisma.property.update({ where: { id: property.id }, data: { viewCount: { increment: 1 } } });

    return res.json({ success: true, data: formatProperty(property) });
  } catch (err) {
    console.error('[property] getProperty error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
}

/**
 * POST /api/properties
 * Creates a new property listing for the authenticated user.
 */
async function createProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const { title, description, price, type, bedrooms, bathrooms, area, address, city, lat, lng } = req.body;

  try {
    const property = await prisma.property.create({
      data: {
        id: uuidv4(),
        title, description,
        price: parseFloat(price),
        type,
        status: 'available',
        bedrooms: parseInt(bedrooms, 10),
        bathrooms: parseInt(bathrooms, 10),
        area: parseFloat(area),
        address, city,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        agentId: req.user.sub,
      },
    });

    await publishEvent('property.created', { propertyId: property.id, agentId: req.user.sub }).catch(() => {});

    return res.status(201).json({ success: true, data: property });
  } catch (err) {
    console.error('[property] createProperty error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create property' });
  }
}

/**
 * PUT /api/properties/:id
 * Updates a property — only the owning agent or an admin may do this.
 */
async function updateProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });
    if (existing.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { title, description, price, type, bedrooms, bathrooms, area, address, city, lat, lng, status } = req.body;

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data:  { title, description, price: parseFloat(price), type, bedrooms: parseInt(bedrooms, 10), bathrooms: parseInt(bathrooms, 10), area: parseFloat(area), address, city, lat: parseFloat(lat), lng: parseFloat(lng), status },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[property] updateProperty error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update property' });
  }
}

/**
 * DELETE /api/properties/:id
 * Soft-deletes a property by setting its status to 'deleted'.
 */
async function deleteProperty(req, res) {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Property not found' });
    if (existing.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await prisma.property.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
    return res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    console.error('[property] deleteProperty error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
}

/**
 * POST /api/properties/:id/images
 * Uploads one or more images to MinIO and stores metadata in the DB.
 */
async function uploadImages(req, res) {
  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: 'No images provided' });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (property.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const saved = await Promise.all(
      req.files.map(async (file) => {
        const objectName = `${req.params.id}/${uuidv4()}-${file.originalname}`;
        await minioClient.putObject(BUCKET, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
        const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET}/${objectName}`;
        return prisma.image.create({
          data: { id: uuidv4(), url, alt: file.originalname, propertyId: req.params.id },
        });
      }),
    );

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('[property] uploadImages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload images' });
  }
}

/**
 * DELETE /api/properties/:id/images/:imageId
 * Removes an image from MinIO and the database.
 */
async function deleteImage(req, res) {
  try {
    const image = await prisma.image.findFirst({ where: { id: req.params.imageId, propertyId: req.params.id } });
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    const objectName = image.url.split(`/${BUCKET}/`)[1];
    if (objectName) await minioClient.removeObject(BUCKET, objectName).catch(() => {});
    await prisma.image.delete({ where: { id: image.id } });

    return res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('[property] deleteImage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete image' });
  }
}

/**
 * POST /api/properties/:id/favorites
 * Toggles the authenticated user's favorite status on a property.
 */
async function toggleFavorite(req, res) {
  try {
    const existing = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId: req.user.sub, propertyId: req.params.id } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.json({ success: true, favorited: false });
    }

    await prisma.favorite.create({ data: { id: uuidv4(), userId: req.user.sub, propertyId: req.params.id } });
    return res.status(201).json({ success: true, favorited: true });
  } catch (err) {
    console.error('[property] toggleFavorite error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
}

/**
 * POST /api/properties/:id/appointments
 * Books a property viewing appointment for the authenticated user.
 */
async function createAppointment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const appointment = await prisma.appointment.create({
      data: {
        id: uuidv4(),
        userId:      req.user.sub,
        propertyId:  req.params.id,
        scheduledAt: new Date(req.body.scheduledAt),
        notes:       req.body.notes ?? null,
        status:      'pending',
      },
    });

    await publishEvent('appointment.created', {
      appointmentId: appointment.id,
      userId:        req.user.sub,
      propertyId:    req.params.id,
      scheduledAt:   req.body.scheduledAt,
    }).catch(() => {});

    return res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[property] createAppointment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create appointment' });
  }
}

/**
 * GET /api/properties/admin/stats
 * Returns platform-wide dashboard statistics (admin only).
 */
async function getAdminStats(req, res) {
  try {
    const [totalProperties, totalUsers, recentListings] = await prisma.$transaction([
      prisma.property.count({ where: { status: { not: 'deleted' } } }),
      prisma.user.count(),
      prisma.property.findMany({
        where:   { status: { not: 'deleted' } },
        orderBy: { createdAt: 'desc' },
        take:    10,
        select:  { id: true, title: true, city: true, price: true, type: true, status: true, createdAt: true },
      }),
    ]);

    const viewsAgg = await prisma.property.aggregate({ _sum: { viewCount: true } });

    return res.json({
      success: true,
      data: {
        totalProperties,
        totalUsers,
        totalViews:   viewsAgg._sum.viewCount ?? 0,
        totalRevenue: 0,
        recentListings,
      },
    });
  } catch (err) {
    console.error('[property] getAdminStats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
}

module.exports = {
  listProperties, getProperty, createProperty, updateProperty, deleteProperty,
  uploadImages, deleteImage, toggleFavorite, createAppointment, getAdminStats,
};
