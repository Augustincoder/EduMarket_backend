const router = require('express').Router();
const notificationController = require('./notification.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

router.use(requireAuth);

router.get('/', asyncHandler(notificationController.getNotifications));
router.patch('/read-all', asyncHandler(notificationController.markAllAsRead));
router.patch('/:id/read', asyncHandler(notificationController.markAsRead));

module.exports = router;
