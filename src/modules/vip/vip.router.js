const router = require('express').Router();
const vipController = require('./vip.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { buyVipSchema } = require('./vip.schema');

// GET /api/v1/vip/packages - Public (or authenticated to see prices)
router.get(
  '/packages',
  asyncHandler(vipController.getPackages)
);

// GET /api/v1/vip/status - Get current user's VIP status
router.get(
  '/status',
  requireAuth,
  asyncHandler(vipController.getStatus)
);

// POST /api/v1/vip/buy - Submit a VIP payment
router.post(
  '/buy',
  requireAuth,
  validate(buyVipSchema, 'body'),
  asyncHandler(vipController.submitPayment)
);

module.exports = router;
