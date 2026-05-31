const router = require('express').Router();
const analyticsController = require('./analytics.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// Require authentication for all analytics routes
router.use(requireAuth);

// GET /api/v1/analytics/me
router.get('/me', asyncHandler(analyticsController.getMyStats));

module.exports = router;
