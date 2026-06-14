const notificationService = require('./notification.service');
const { AppError } = require('../../middleware/errorHandler');

exports.getNotifications = async (req, res) => {
  const { limit, cursor } = req.query;
  const parsedLimit = limit ? parseInt(limit, 10) : 20;
  
  const data = await notificationService.getNotifications(req.user.id, parsedLimit, cursor);
  
  res.status(200).json({
    status: 'success',
    data
  });
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  
  try {
    await notificationService.markAsRead(id, req.user.id);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    throw new AppError(err.message, 403);
  }
};

exports.markAllAsRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.status(200).json({ status: 'success' });
};
