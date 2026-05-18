'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN         ?? '15m';
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET environment variables are required');
}

/**
 * Generates a new access + refresh token pair.
 *
 * @param {{ sub: string, email: string, role: string }} payload
 * @returns {{ accessToken: string, refreshToken: string, expiresIn: string }}
 */
function generateTokens(payload) {
  const accessToken  = jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_TTL });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 *
 * @param {string} token
 * @returns {jwt.JwtPayload}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };
