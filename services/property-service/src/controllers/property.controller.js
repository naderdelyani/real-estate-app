'use strict';

const { validationResult } = require('express-validator');
const { v4: uuidv4 }        = require('uuid');
const { PrismaClient }      = require('@prisma/client');
const { minioClient, BUCKET } = require('../utils/minio.utils');
const { publishEvent }      = require('../utils/rabbitmq.utils');

const prisma = new PrismaClient();

const MESSAGES = {
  en: {
    failedToFetchProperties: 'Failed to fetch properties',
    propertyNotFound:        'Property not found',
    failedToFetchProperty:   'Failed to fetch property',
    failedToCreateProperty:  'Failed to create property',
    forbidden:               'Forbidden',
    failedToUpdateProperty:  'Failed to update property',
    propertyDeleted:         'Property deleted',
    failedToDeleteProperty:  'Failed to delete property',
    noImagesProvided:        'No images provided',
    failedToUploadImages:    'Failed to upload images',
    imageNotFound:           'Image not found',
    imageDeleted:            'Image deleted',
    failedToDeleteImage:     'Failed to delete image',
    failedToToggleFavorite:  'Failed to toggle favorite',
    failedToCreateAppointment: 'Failed to create appointment',
    failedToFetchStats:      'Failed to fetch stats',
  },
  fa: {
    failedToFetchProperties: 'دریافت ملک‌ها ناموفق بود',
    propertyNotFound:        'ملک یافت نشد',
    failedToFetchProperty:   'دریافت ملک ناموفق بود',
    failedToCreateProperty:  'ایجاد ملک ناموفق بود',
    forbidden:               'دسترسی غیرمجاز',
    failedToUpdateProperty:  'به‌روزرسانی ملک ناموفق بود',
    propertyDeleted:         'ملک حذف شد',
    failedToDeleteProperty:  'حذف ملک ناموفق بود',
    noImagesProvided:        'تصویری ارائه نشده است',
    failedToUploadImages:    'آپلود تصاویر ناموفق بود',
    imageNotFound:           'تصویر یافت نشد',
    imageDeleted:            'تصویر حذف شد',
    failedToDeleteImage:     'حذف تصویر ناموفق بود',
    failedToToggleFavorite:  'تغییر وضعیت علاقه‌مندی ناموفق بود',
    failedToCreateAppointment: 'ایجاد قرار ملاقات ناموفق بود',
    failedToFetchStats:      'دریافت آمار ناموفق بود',
  },
};

function getLocale(req) {
  const lang = req.headers['accept-language'] || 'en';
  return lang.startsWith('fa') ? 'fa' : 'en';
}

function msg(req, key) {
  const locale = getLocale(req);
  return (MESSAGES[locale] || MESSAGES.en)[key] || MESSAGES.en[key];
}

function sendValidationError(res, errors) {
  return res.status(422).json({ success: false, errors: errors.array() });
}

function formatProperty(p) {
  return { ...p };
}

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
    return res.status(500).json({ success: false, message: msg(req, 'failedToFetchProperties') });
  }
}

async function getProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const property = await prisma.property.findUnique({
      where:   { id: req.params.id },
      include: { images: true, agent: { select: { id: true, name: true, phone: true, avatar: true } } },
    });
    if (!property) return res.status(404).json({ success: false, message: msg(req, 'propertyNotFound') });

    await prisma.property.update({ where: { id: property.id }, data: { viewCount: { increment: 1 } } });

    return res.json({ success: true, data: formatProperty(property) });
  } catch (err) {
    console.error('[property] getProperty error:', err);
    return res.status(500).json({ success: false, message: msg(req, 'failedToFetchProperty') });
  }
}

async function createProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const { title, description, price, type, bedrooms, bathrooms, area, address, city, lat, lng } = req.body;

  try {
    const property = await prisma.property.create({
      data: {
        id: uuidv4(),
        title, description,
        price:     parseFloat(price),
        type,
        status:    'available',
        bedrooms:  parseInt(bedrooms, 10),
        bathrooms: parseInt(bathrooms, 10),
        area:      parseFloat(area),
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
    return res.status(500).json({ success: false, message: msg(req, 'failedToCreateProperty') });
  }
}

async function updateProperty(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: msg(req, 'propertyNotFound') });
    if (existing.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: msg(req, 'forbidden') });
    }

    const { title, description, price, type, bedrooms, bathrooms, area, address, city, lat, lng, status } = req.body;

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data:  { title, description, price: parseFloat(price), type, bedrooms: parseInt(bedrooms, 10), bathrooms: parseInt(bathrooms, 10), area: parseFloat(area), address, city, lat: parseFloat(lat), lng: parseFloat(lng), status },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[property] updateProperty error:', err);
    return res.status(500).json({ success: false, message: msg(req, 'failedToUpdateProperty') });
  }
}

async function deleteProperty(req, res) {
  try {
    const existing = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: msg(req, 'propertyNotFound') });
    if (existing.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: msg(req, 'forbidden') });
    }

    await prisma.property.update({ where: { id: req.params.id }, data: { status: 'deleted' } });
    return res.json({ success: true, message: msg(req, 'propertyDeleted') });
  } catch (err) {
    console.error('[property] deleteProperty error:', err);
    return res.status(500).json({ success: false, message: msg(req, 'failedToDeleteProperty') });
  }
}

async function uploadImages(req, res) {
  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: msg(req, 'noImagesProvided') });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) return res.status(404).json({ success: false, message: msg(req, 'propertyNotFound') });
    if (property.agentId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: msg(req, 'forbidden') });
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
    return res.status(500).json({ success: false, message: msg(req, 'failedToUploadImages') });
  }
}

async function deleteImage(req, res) {
  try {
    const image = await prisma.image.findFirst({ where: { id: req.params.imageId, propertyId: req.params.id } });
    if (!image) return res.status(404).json({ success: false, message: msg(req, 'imageNotFound') });

    const objectName = image.url.split(`/${BUCKET}/`)[1];
    if (objectName) await minioClient.removeObject(BUCKET, objectName).catch(() => {});
    await prisma.image.delete({ where: { id: image.id } });

    return res.json({ success: true, message: msg(req, 'imageDeleted') });
  } catch (err) {
    console.error('[property] deleteImage error:', err);
    return res.status(500).json({ success: false, message: msg(req, 'failedToDeleteImage') });
  }
}

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
    return res.status(500).json({ success: false, message: msg(req, 'failedToToggleFavorite') });
  }
}

async function createAppointment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property) return res.status(404).json({ success: false, message: msg(req, 'propertyNotFound') });

    const appointment = await prisma.appointment.create({
      data: {
        id:          uuidv4(),
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
      locale:        req.headers['accept-language']?.startsWith('fa') ? 'fa' : 'en',
    }).catch(() => {});

    return res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    console.error('[property] createAppointment error:', err);
    return res.status(500).json({ success: false, message: msg(req, 'failedToCreateAppointment') });
  }
}

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
    return res.status(500).json({ success: false, message: msg(req, 'failedToFetchStats') });
  }
}

module.exports = {
  listProperties, getProperty, createProperty, updateProperty, deleteProperty,
  uploadImages, deleteImage, toggleFavorite, createAppointment, getAdminStats,
};
