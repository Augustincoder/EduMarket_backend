const router = require('express').Router();
const multer = require('multer');
const fileController = require('./file.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { uploadRateLimiter } = require('../../middleware/rateLimiter');

// Configure multer for memory storage (we stream directly to Telegram)
// Limits: 20MB per file, max 5 files per request
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 5
  }
});

// POST /api/v1/files/upload
router.post(
  '/upload',
  requireAuth,
  uploadRateLimiter, // 20 uploads / hour per IP
  upload.array('files', 5),
  asyncHandler(fileController.uploadFiles)
);

// GET /api/v1/files/:fileId/url
router.get(
  '/:fileId/url',
  requireAuth,
  asyncHandler(fileController.getFileUrl)
);

module.exports = router;
