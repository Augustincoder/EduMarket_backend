const router = require('express').Router();
const adminController = require('./admin.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/adminOnly');
const { asyncHandler } = require('../../middleware/errorHandler');

// All routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/v1/admin/stats
router.get('/stats', asyncHandler(adminController.getStats));

// POST /api/v1/admin/users/:userId/ban
router.post('/users/:userId/ban', asyncHandler(adminController.setUserBan));

// GET /api/v1/admin/vip-requests
router.get('/vip-requests', asyncHandler(adminController.getPendingVipRequests));

// POST /api/v1/admin/vip-requests/:paymentId
router.post('/vip-requests/:paymentId', asyncHandler(adminController.processVipRequest));

// GET /api/v1/admin/fraud-logs
router.get('/fraud-logs', asyncHandler(adminController.getFraudLogs));

// POST /api/v1/admin/fraud-logs/:logId/resolve
router.post('/fraud-logs/:logId/resolve', asyncHandler(adminController.resolveFraudLog));

// GET /api/v1/admin/disputes
router.get('/disputes', asyncHandler(adminController.getDisputes));

// POST /api/v1/admin/disputes/:id/resolve
router.post('/disputes/:id/resolve', asyncHandler(adminController.resolveDispute));

module.exports = router;
