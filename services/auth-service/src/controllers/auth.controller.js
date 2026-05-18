'use strict';

const bcrypt           = require('bcryptjs');
const { v4: uuidv4 }   = require('uuid');
const { validationResult } = require('express-validator');
const { Pool }         = require('pg');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.utils');
const redis            = require('../utils/redis.utils');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Sends a 422 response with field-level validation errors.
 * @param {import('express').Response} res
 * @param {import('express-validator').Result} errors
 */
function sendValidationError(res, errors) {
  return res.status(422).json({ success: false, errors: errors.array() });
}

/**
 * POST /api/auth/register
 * Creates a new user account and returns JWT tokens.
 */
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const { name, email, password } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1,$2,$3,$4,NOW())',
      [id, name, email, passwordHash],
    );

    const tokens = generateTokens({ sub: id, email, role: 'user' });
    await redis.set(`refresh:${tokens.refreshToken}`, id, 'EX', 7 * 24 * 60 * 60);

    return res.status(201).json({
      success: true,
      message: 'Account created',
      data: { user: { id, name, email, role: 'user' }, ...tokens },
    });
  } catch (err) {
    console.error('[auth] register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT tokens.
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const tokens = generateTokens({ sub: user.id, email: user.email, role: user.role });
    await redis.set(`refresh:${tokens.refreshToken}`, user.id, 'EX', 7 * 24 * 60 * 60);

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return res.json({
      success: true,
      data: {
        user:  { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
}

/**
 * POST /api/auth/refresh
 * Issues a new access/refresh token pair, invalidating the old refresh token.
 */
async function refresh(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendValidationError(res, errors);

  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);
    const stored  = await redis.get(`refresh:${refreshToken}`);

    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or expired' });
    }

    // Rotate: delete old token, issue new pair
    await redis.del(`refresh:${refreshToken}`);
    const tokens = generateTokens({ sub: payload.sub, email: payload.email, role: payload.role });
    await redis.set(`refresh:${tokens.refreshToken}`, payload.sub, 'EX', 7 * 24 * 60 * 60);

    return res.json({ success: true, data: tokens });
  } catch (err) {
    console.error('[auth] refresh error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

/**
 * POST /api/auth/logout
 * Revokes the refresh token stored in Redis.
 */
async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await redis.del(`refresh:${refreshToken}`).catch(() => {});
  }
  return res.json({ success: true, message: 'Logged out' });
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
async function getMe(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.sub],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[auth] getMe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
}

module.exports = { register, login, refresh, logout, getMe };
