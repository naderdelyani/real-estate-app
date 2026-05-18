'use strict';

const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Multer instance configured for in-memory storage.
 * Only allows JPEG, PNG, WebP, and HEIC images up to 10 MB each.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:  MAX_FILE_SIZE_BYTES,
    files:     10,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unsupported file type: ${file.mimetype}`));
    }
  },
});

module.exports = { upload };
