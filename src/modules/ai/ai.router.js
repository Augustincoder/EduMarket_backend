const router = require('express').Router();
const aiController = require('./ai.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/v1/ai/learning-compass
router.get(
  '/learning-compass',
  requireAuth,
  asyncHandler(aiController.getLearningCompass)
);

module.exports = router;
