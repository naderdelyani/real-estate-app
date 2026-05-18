'use strict';

require('dotenv').config();

const express          = require('express');
const helmet           = require('helmet');
const cors             = require('cors');
const morgan           = require('morgan');
const rateLimit        = require('express-rate-limit');
const propertyRoutes   = require('./routes/property.routes');

const app  = express();
const PORT = process.env.PORT ?? 4002;

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'property-service',
    version: process.env.npm_package_version ?? '1.0.0',
    uptime:  process.uptime(),
    ts:      new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/properties', propertyRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[property-service] Unhandled error:', err);
  if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Record not found' });
  if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate entry' });
  res.status(err.status ?? 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => console.log(`[property-service] Listening on port ${PORT}`));

module.exports = app;
