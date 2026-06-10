// src/modules/file/file.router.js
const router = require('express').Router();
const multer = require('multer');
const fileController = require('./file.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { uploadRateLimiter } = require('../../middleware/rateLimiter');

// Configure multer for memory storage (buffer sent directly to Cloudflare R2)
// Limits: 20MB per file, max 5 files per request
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4 MB (Vercel Free Tier limit is 4.5MB payload)
    files: 5,
  },
});

// POST /api/v1/files/upload
// Upload files → stored in Cloudflare R2 → returns object keys as fileIds
router.post(
  '/upload',
  requireAuth,
  uploadRateLimiter,
  upload.array('files', 5),
  asyncHandler(fileController.uploadFiles)
);

// POST /api/v1/files/batch-urls
// Get download URLs for multiple files at once (body: { fileIds: string[] })
router.post(
  '/batch-urls',
  requireAuth,
  asyncHandler(fileController.getBatchUrls)
);

// GET /api/v1/files/:fileId/url
// Get signed/public download URL for a single file
// Note: fileId must be URL-encoded (it's an R2 key like "uploads/2026/06/uuid.pdf")
router.get(
  '/:fileId/url',
  requireAuth,
  asyncHandler(fileController.getFileUrl)
);


// ─── Phase 13: Secure Ephemeral Streaming ──────────────────────────────────────

// GET /api/v1/files/:fileId/secure-token
// Returns a 60-second JWT token to view the file
router.get(
  '/:fileId/secure-token',
  requireAuth,
  asyncHandler(fileController.getSecureToken)
);

// GET /api/v1/files/stream/:token
// Returns the actual file binary stream (used by EduViewer)
// NO requireAuth because the token is the authentication
router.get(
  '/stream/:token',
  asyncHandler(fileController.streamSecureFile)
);

// ───────────────────────────────────────────────────────────────────────────────

// DELETE /api/v1/files/:fileId
// Delete a file from R2 storage
router.delete(
  '/:fileId',
  requireAuth,
  asyncHandler(fileController.deleteFile)
);

module.exports = router;
