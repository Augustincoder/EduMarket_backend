const taskService = require('./task.service');

async function createTask(req, res) {
  const clientId = req.user.userId;
  const task = await taskService.createTask(clientId, req.body);
  res.status(201).json({ success: true, message: 'Vazifa muvaffaqiyatli yaratildi', data: task });
}

async function listTasks(req, res) {
  const result = await taskService.listTasks(req.query);
  res.json({ success: true, data: result });
}

async function getTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  if (isNaN(taskId)) return res.status(400).json({ success: false, message: 'Yaroqsiz ID' });
  const task = await taskService.getTaskById(taskId);
  res.json({ success: true, data: task });
}

async function startProgress(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const task = await taskService.startProgress(taskId, req.user.userId);
  res.json({ success: true, message: 'Vazifa bajarilishi boshlandi', data: task });
}

async function submitTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const task = await taskService.submitForReview(taskId, req.user.userId);
  res.json({ success: true, message: 'Vazifa tekshirish uchun yuborildi', data: task });
}

async function acceptTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const task = await taskService.acceptDelivery(taskId, req.user.userId);
  res.json({ success: true, message: 'Vazifa qabul qilindi. To\'lov o\'tkaziladi.', data: task });
}

async function requestRevision(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const { note } = req.body;
  const task = await taskService.requestRevision(taskId, req.user.userId, note);
  res.json({ success: true, message: 'Vazifa qayta ishlashga qaytarildi', data: task });
}

async function cancelTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const task = await taskService.cancelTask(taskId, req.user.userId);
  res.json({ success: true, message: 'Vazifa bekor qilindi', data: task });
}

async function openDispute(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: 'Nizo sababini kiriting' });
  const result = await taskService.openDispute(taskId, req.user.userId, reason);
  res.json({ success: true, message: 'Nizo ochildi', data: result.updatedTask });
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params.id, 10);
  await taskService.deleteTask(taskId, req.user.userId);
  res.json({ success: true, message: 'Vazifa o\'chirildi' });
}

module.exports = {
  createTask,
  listTasks,
  getTask,
  startProgress,
  submitTask,
  acceptTask,
  requestRevision,
  cancelTask,
  openDispute,
  deleteTask
};
