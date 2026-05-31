const chatService = require('./chat.service');

/**
 * Send a message
 */
async function sendMessage(req, res) {
  const taskId = parseInt(req.params.taskId, 10);
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
  const taskId = parseInt(req.params.taskId, 10);
  const userId = req.user.userId;
  
  const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

  const result = await chatService.getMessages(taskId, userId, cursor, limit);
  
  res.json({
    success: true,
    data: result
  });
}

module.exports = {
  sendMessage,
  getMessages
};
