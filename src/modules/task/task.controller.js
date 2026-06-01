const taskService = require('./task.service');
const { clearCache } = require('../../middleware/cache');

async function createTask(req, res) {
  const clientId = req.user.userId;
  const task = await taskService.createTask(clientId, req.body);
  await clearCache('/api/v1/tasks*');
  res.status(201).json({ success: true, message: 'Vazifa muvaffaqiyatli yaratildi', data: task });
}

async function listTasks(req, res) {
  const result = await taskService.listTasks(req.query);
  res.json({ success: true, data: result });
}

async function getMyTasks(req, res) {
  const filters = {
    role: req.query.role,
    status: req.query.status
  };
  const tasks = await taskService.getMyTasks(req.user.userId || req.user.id, filters);
  res.json({ success: true, data: tasks });
}

async function getTask(req, res) {
  const taskId = req.params.id;
  if (!taskId) return res.status(400).json({ success: false, message: 'Yaroqsiz ID' });
  const task = await taskService.getTaskById(taskId);
  res.json({ success: true, data: task });
}

async function startProgress(req, res) {
  const taskId = req.params.id;
  const task = await taskService.startProgress(taskId, req.user.userId);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Vazifa bajarilishi boshlandi', data: task });
}

async function submitTask(req, res) {
  const taskId = req.params.id;
  const task = await taskService.submitForReview(taskId, req.user.userId);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Vazifa tekshirish uchun yuborildi', data: task });
}

async function acceptTask(req, res) {
  const taskId = req.params.id;
  const task = await taskService.acceptDelivery(taskId, req.user.userId);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Vazifa qabul qilindi. To\'lov o\'tkaziladi.', data: task });
}

async function requestRevision(req, res) {
  const taskId = req.params.id;
  const { note } = req.body;
  const task = await taskService.requestRevision(taskId, req.user.userId, note);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Vazifa qayta ishlashga qaytarildi', data: task });
}

async function cancelTask(req, res) {
  const taskId = req.params.id;
  const task = await taskService.cancelTask(taskId, req.user.userId);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Vazifa bekor qilindi', data: task });
}

async function openDispute(req, res) {
  const taskId = req.params.id;
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Nizo sababini kiriting' });
  const result = await taskService.openDispute(taskId, req.user.userId, reason);
  await clearCache(`/api/v1/tasks*`);
  res.json({ success: true, message: 'Nizo ochildi', data: result.updatedTask });
}

async function deleteTask(req, res) {
  const taskId = req.params.id;
  await taskService.deleteTask(taskId, req.user.userId);
  await clearCache('/api/v1/tasks*');
  res.json({ success: true, message: 'Vazifa o\'chirildi' });
}

module.exports = {
  createTask,
  listTasks,
  getMyTasks,
  getTask,
  startProgress,
  submitTask,
  acceptTask,
  requestRevision,
  cancelTask,
  openDispute,
  deleteTask
};
