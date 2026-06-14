const router = require('express').Router();
const chatController = require('./chat.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { 
  sendMessageSchema, 
  editMessageSchema,
  createGroupSchema,
  updateGroupSchema,
  inviteUserSchema
} = require('./chat.schema');

router.use(requireAuth);

/** =========================================
 *  ROOM & INVITES (BOSQICH 1 va 2)
 *  ========================================= */

// Barcha chatlar ro'yxati (Sidebar uchun)
router.get('/', asyncHandler(chatController.getConversations));

// Yangi ixtiyoriy guruh yaratish
router.post('/group', validate(createGroupSchema, 'body'), asyncHandler(chatController.createCustomGroup));

// Direct chat ochish yoki olish
router.post('/direct', asyncHandler(chatController.getOrCreateDirectChat));

// Task uchun chat xonasini olish yoki yaratish
router.get('/task/:taskId', asyncHandler(chatController.getOrCreateTaskRoom));

// Takliflar bo'limi
router.get('/invites', asyncHandler(chatController.getMyInvites));
router.post('/invites/:inviteId/accept', asyncHandler(chatController.acceptInvite));
router.post('/invites/:inviteId/reject', asyncHandler(chatController.rejectInvite));

// Username bo'yicha qidirib taklif yuborish
router.get('/:chatRoomId/search-users', asyncHandler(chatController.searchUsersForInvite));
router.post('/:chatRoomId/invite', validate(inviteUserSchema, 'body'), asyncHandler(chatController.sendInvite));

// Guruh sozlamalari
router.put('/:chatRoomId/settings', validate(updateGroupSchema, 'body'), asyncHandler(chatController.updateGroupSettings));
router.delete('/:chatRoomId/participants/:targetUserId', asyncHandler(chatController.removeParticipant));
router.post('/:chatRoomId/leave', asyncHandler(chatController.leaveGroup));
router.get('/:chatRoomId/info', asyncHandler(chatController.getChatRoomInfo));

/** =========================================
 *  MESSAGING (BOSQICH 3)
 *  ========================================= */

// Xabarlarni global qidirish
router.get('/search/messages', asyncHandler(chatController.searchGlobalMessages));

// Xabarlarni o'qish (limit, cursor)
router.get('/:chatRoomId/messages', asyncHandler(chatController.getMessages));

// Xabarlarni o'qilgan deb belgilash
router.post('/:chatRoomId/read', asyncHandler(chatController.markAsRead));

// Yangi xabar yuborish
router.post('/:chatRoomId/messages', validate(sendMessageSchema, 'body'), asyncHandler(chatController.sendMessage));

// Xabarni qadash
router.post('/:chatRoomId/messages/:messageId/pin', asyncHandler(chatController.pinMessage));

// Xabarni tahrirlash / O'chirish / Reaksiya
router.put('/messages/:messageId', validate(editMessageSchema, 'body'), asyncHandler(chatController.editMessage));
router.delete('/messages/:messageId', asyncHandler(chatController.deleteMessage));
router.post('/messages/:messageId/reaction', asyncHandler(chatController.toggleReaction));

module.exports = router;
