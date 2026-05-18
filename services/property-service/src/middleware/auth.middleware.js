'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET;

/**
 * Validates the Bearer token from the Authorization header.
 * Attaches the decoded JWT payload to `req.user`.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), ACCESS_SECRET);
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
}

/**
 * Role-guard middleware factory. Must be used after `authenticate`.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
