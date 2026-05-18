'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadImages,
  deleteImage,
  toggleFavorite,
  createAppointment,
  getAdminStats,
} = require('../controllers/property.controller');

const router = Router();

/** Reusable property body validation rules. */
const propertyBodyRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('type').isIn(['sale', 'rent']).withMessage('Type must be sale or rent'),
  body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('area').isFloat({ min: 1 }).withMessage('Area must be greater than 0'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('lat').isFloat({ min: -90,  max: 90  }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// ─── Public Endpoints ─────────────────────────────────────────────────────────
router.get('/',     [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['price:asc', 'price:desc', 'createdAt:desc', 'createdAt:asc']),
], listProperties);

router.get('/admin/stats', authenticate, requireRole('admin'), getAdminStats);

router.get('/:id', [param('id').isUUID()], getProperty);

// ─── Protected Endpoints ──────────────────────────────────────────────────────
router.post('/',      authenticate, propertyBodyRules, createProperty);
router.put('/:id',   authenticate, [param('id').isUUID(), ...propertyBodyRules], updateProperty);
router.delete('/:id', authenticate, [param('id').isUUID()], deleteProperty);

// Images
router.post(  '/:id/images',           authenticate, [param('id').isUUID()], upload.array('images', 10), uploadImages);
router.delete('/:id/images/:imageId',  authenticate, [param('id').isUUID(), param('imageId').isUUID()], deleteImage);

// Favorites & Appointments
router.post('/:id/favorites',    authenticate, [param('id').isUUID()], toggleFavorite);
router.post('/:id/appointments', authenticate, [
  param('id').isUUID(),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
  body('notes').optional().trim().isLength({ max: 500 }),
], createAppointment);

module.exports = router;
