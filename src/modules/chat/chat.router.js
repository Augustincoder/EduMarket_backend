const router = require('express').Router();
const chatController = require('./chat.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

// GET /api/v1/chat/:taskId - Get messages for a task
const { validate } = require('../../middleware/validate');
const { sendMessageSchema, editMessageSchema } = require('./chat.schema');

router.use(requireAuth);

// GET /api/v1/chat/conversations
router.get('/conversations', asyncHandler(chatController.getConversations));

// GET /api/v1/chat/:taskId
router.get('/:taskId', asyncHandler(chatController.getMessages));

// POST /api/v1/chat/:taskId
router.post(
  '/:taskId',
  validate(sendMessageSchema, 'body'),
  asyncHandler(chatController.sendMessage)
);

// POST /api/v1/chat/:taskId/read
router.post('/:taskId/read', asyncHandler(chatController.markAsRead));

// PUT /api/v1/chat/messages/:messageId
router.put(
  '/messages/:messageId',
  validate(editMessageSchema, 'body'),
  asyncHandler(chatController.editMessage)
);

// DELETE /api/v1/chat/messages/:messageId
router.delete(
  '/messages/:messageId',
  asyncHandler(chatController.deleteMessage)
);

module.exports = router;
