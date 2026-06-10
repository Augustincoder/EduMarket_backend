const prisma = require('../../config/prisma');
const taskRepository = require('./task.repository');
const { AppError } = require('../../middleware/errorHandler');
const { getIO } = require('../../config/socket');

async function getMilestones(req, res) {
  const taskId = req.params.id;
  const milestones = await prisma.taskMilestone.findMany({
    where: { taskId },
    orderBy: { order: 'asc' }
  });
  
  res.json({ success: true, data: milestones });
}

async function createMilestone(req, res) {
  const taskId = req.params.id;
  const { title } = req.body;
  const userId = req.user.userId;

  // Verify task membership
  const task = await taskRepository.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== userId && task.freelancerId !== userId) {
    throw new AppError('Ruxsat yo\'q', 403);
  }

  // Get current max order
  const maxOrderMilestone = await prisma.taskMilestone.findFirst({
    where: { taskId },
    orderBy: { order: 'desc' },
  });
  const order = maxOrderMilestone ? maxOrderMilestone.order + 1 : 0;

  const milestone = await prisma.taskMilestone.create({
    data: { taskId, title, order }
  });

  // Emit event via socket to all users in the task room
  const io = getIO();
  io.to(`task_${taskId}`).emit('milestone_updated', { type: 'CREATED', milestone });

  res.status(201).json({ success: true, data: milestone });
}

async function toggleMilestone(req, res) {
  const taskId = req.params.id;
  const milestoneId = req.params.milestoneId;
  const { isCompleted } = req.body;
  const userId = req.user.userId;

  const task = await taskRepository.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== userId && task.freelancerId !== userId) {
    throw new AppError('Ruxsat yo\'q', 403);
  }

  const milestone = await prisma.taskMilestone.update({
    where: { id: milestoneId },
    data: { isCompleted }
  });

  const io = getIO();
  io.to(`task_${taskId}`).emit('milestone_updated', { type: 'UPDATED', milestone });

  res.json({ success: true, data: milestone });
}

async function deleteMilestone(req, res) {
  const taskId = req.params.id;
  const milestoneId = req.params.milestoneId;
  const userId = req.user.userId;

  const task = await taskRepository.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== userId && task.freelancerId !== userId) {
    throw new AppError('Ruxsat yo\'q', 403);
  }

  await prisma.taskMilestone.delete({ where: { id: milestoneId } });

  const io = getIO();
  io.to(`task_${taskId}`).emit('milestone_updated', { type: 'DELETED', milestoneId });

  res.json({ success: true, data: null });
}

module.exports = {
  getMilestones,
  createMilestone,
  toggleMilestone,
  deleteMilestone
};
