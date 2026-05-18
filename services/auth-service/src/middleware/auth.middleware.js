'use strict';

const { verifyAccessToken } = require('../utils/jwt.utils');

/**
 * Express middleware that validates the Bearer token in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
}

/**
 * Middleware factory that checks the authenticated user has one of the allowed roles.
 * Must be used after `authenticate`.
 *
 * @param {...string} roles - Allowed role strings (e.g. 'admin', 'agent')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
