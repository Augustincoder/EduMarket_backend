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

// GET /api/v1/admin/users
router.get('/users', asyncHandler(adminController.getUsers));

// POST /api/v1/admin/users/:userId/ban
router.post('/users/:userId/ban', asyncHandler(adminController.setUserBan));

// POST /api/v1/admin/users/:userId/vip
router.post('/users/:userId/vip', asyncHandler(adminController.setUserVip));

// POST /api/v1/admin/users/:userId/warn
router.post('/users/:userId/warn', asyncHandler(adminController.warnUser));

// POST /api/v1/admin/users/:userId/verify-student
router.post('/users/:userId/verify-student', asyncHandler(adminController.verifyStudent));

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

// GET /api/v1/admin/disputes/:id/chat
router.get('/disputes/:id/chat', asyncHandler(adminController.getDisputeChat));

// GET /api/v1/admin/transactions
router.get('/transactions', asyncHandler(adminController.getTransactions));

// GET /api/v1/admin/settings
router.get('/settings', asyncHandler(adminController.getSettings));

// PUT /api/v1/admin/settings
router.put('/settings', asyncHandler(adminController.updateSetting));

// GET /api/v1/admin/logs
router.get('/logs', asyncHandler(adminController.getAuditLogs));

// POST /api/v1/admin/broadcast
router.post('/broadcast', asyncHandler(adminController.broadcastMessage));

// DELETE /api/v1/admin/tasks/:taskId
router.delete('/tasks/:taskId', asyncHandler(adminController.deleteTask));

// DELETE /api/v1/admin/gigs/:gigId
router.delete('/gigs/:gigId', asyncHandler(adminController.deleteGig));

module.exports = router;
