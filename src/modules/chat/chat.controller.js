const chatService = require('./chat.service');

/**
 * Send a message
 */
async function sendMessage(req, res) {
  const taskId = req.params.taskId;
  const senderId = req.user.userId;
  
  const message = await chatService.sendMessage(taskId, senderId, req.body);
  
  res.status(201).json({
    success: true,
    data: message
  });
}

/**
 * Get messages
 */
async function getMessages(req, res) {
  const taskId = req.params.taskId;
  const userId = req.user.userId;
  
  const cursor = req.query.cursor || undefined;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

  const result = await chatService.getMessages(taskId, userId, cursor, limit);
  
  res.json({
    success: true,
    data: result
  });
}

/**
 * Get all conversations
 */
async function getConversations(req, res) {
  const userId = req.user.userId || req.user.id;
  const conversations = await chatService.getConversations(userId);
  
  res.json({
    success: true,
    data: conversations
  });
}

/**
 * Mark all unread messages as read
 */
async function markAsRead(req, res) {
  const taskId = req.params.taskId;
  const userId = req.user.userId;

  const result = await chatService.markAsRead(taskId, userId);

  res.json({
    success: true,
    data: result
  });
}

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead
};
