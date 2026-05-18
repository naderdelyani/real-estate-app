'use strict';

const { Router }                    = require('express');
const { body }                      = require('express-validator');
const { authenticate }              = require('../middleware/auth.middleware');
const {
  register,
  login,
  refresh,
  logout,
  getMe,
} = require('../controllers/auth.controller');

const router = Router();

/** Shared password validation rule — min 8 chars, at least one digit. */
const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/\d/)
  .withMessage('Password must contain at least one number');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    passwordRule,
  ],
  register,
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login,
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  refresh,
);

// POST /api/auth/logout  (requires valid access token)
router.post('/logout', authenticate, logout);

// GET  /api/auth/me      (requires valid access token)
router.get('/me', authenticate, getMe);

module.exports = router;
