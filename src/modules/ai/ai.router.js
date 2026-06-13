const router = require('express').Router();
const aiController = require('./ai.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const rateLimit = require('express-rate-limit');

// Rate limiting for AI endpoint (max 10 requests per 15 minutes per IP)
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10,
  message: { success: false, message: "AI so'rovlari limiti tugadi. Iltimos 15 daqiqadan so'ng urinib ko'ring." },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/v1/ai/learning-compass
router.get(
  '/learning-compass',
  requireAuth,
  asyncHandler(aiController.getLearningCompass)
);

// POST /api/v1/ai/parse-task
router.post(
  '/parse-task',
  requireAuth,
  aiRateLimiter,
  asyncHandler(aiController.parseTask)
);

module.exports = router;
