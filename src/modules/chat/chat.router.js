const router = require('express').Router();
const chatController = require('./chat.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/v1/chat/:taskId - Get messages for a task
const { validate } = require('../../middleware/validate');
const { sendMessageSchema } = require('./chat.schema');

router.use(requireAuth);

// GET /api/v1/chat/:taskId
router.get('/:taskId', asyncHandler(chatController.getMessages));

// POST /api/v1/chat/:taskId
router.post(
  '/:taskId',
  validate(sendMessageSchema, 'body'),
  asyncHandler(chatController.sendMessage)
);

module.exports = router;
