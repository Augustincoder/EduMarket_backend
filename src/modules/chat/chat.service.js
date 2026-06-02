const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { getIO, isUserOnline } = require('../../config/socket');

/**
 * Validates if a user has access to a task's chat
 */
async function checkChatAccess(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { clientId: true, freelancerId: true, status: true }
  });

  if (!task) {
    throw new AppError('Vazifa topilmadi', 404);
  }

  // Only client and assigned freelancer can chat
  if (task.clientId !== userId && task.freelancerId !== userId) {
    throw new AppError('Ushbu chatga kirish huquqingiz yo\'q', 403);
  }

  return task;
}

/**
 * Send a message in a task's chat
 */
async function sendMessage(taskId, senderId, data) {
  const task = await checkChatAccess(taskId, senderId);

  // Note: File handling (if data contains file_id) is handled by the controller
  // and passed here as data.fileId, data.fileType, etc.

  const message = await prisma.chatMessage.create({
    data: {
      taskId,
      senderId,
      content: data.content,
      fileId: data.fileId,
      fileType: data.fileType,
      fileName: data.fileName,
      isRead: false
    }
  });

  // Emit Real-time Socket.io Event to the task room
  try {
    const io = getIO();
    const roomName = `task_${taskId}`;
    io.to(roomName).emit('new_message', message);
  } catch (err) {
    // Ignored: socket might not be initialized during test/startup
  }

  // Telegram notification fallback if recipient is offline
  try {
    const recipientId = task.clientId === senderId ? task.freelancerId : task.clientId;
    if (recipientId) {
      const recipientOnline = await isUserOnline(recipientId);
      if (!recipientOnline) {
        const sender = await prisma.user.findUnique({
          where: { id: senderId },
          select: { fullname: true }
        });
        const senderName = sender ? sender.fullname : 'Foydalanuvchi';
        const notificationService = require('../notification/notification.service');
        notificationService.notifyChatMessage(recipientId, senderName, taskId)
          .catch(err => console.error('Failed to send Telegram notification:', err));
      }
    }
  } catch (err) {
    console.error('Failed offline notification check:', err);
  }

  return message;
}

/**
 * Get messages for a specific task chat (cursor-based pagination)
 */
async function getMessages(taskId, userId, cursor, limit = 50) {
  await checkChatAccess(taskId, userId);

  const where = { taskId };
  if (cursor) {
    where.id = { lt: cursor }; // Pagination: older messages
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    take: limit,
    orderBy: { id: 'desc' }, // Latest first
    include: {
      sender: {
        select: { id: true, fullname: true, avatarUrl: true }
      }
    }
  });

  // Mark messages as read if sent by the OTHER person
  const unreadMessageIds = messages
    .filter(m => !m.isRead && m.senderId !== userId)
    .map(m => m.id);

  if (unreadMessageIds.length > 0) {
    // Non-blocking update (fire and forget)
    prisma.chatMessage.updateMany({
      where: { id: { in: unreadMessageIds } },
      data: { isRead: true }
    }).catch(err => console.error('Failed to mark messages read', err));
  }

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  return {
    messages,
    nextCursor
  };
}

/**
 * Barcha faol chatlarni olish (Conversations List)
 */
async function getConversations(userId) {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ clientId: userId }, { freelancerId: userId }],
      status: { in: ['ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] }
    },
    include: {
      client: { select: { id: true, fullname: true, avatarUrl: true } },
      freelancer: { select: { id: true, fullname: true, avatarUrl: true } },
      chat: {
        orderBy: { createdAt: 'desc' },
        take: 1,  // Oxirgi xabar
      },
      _count: {
        select: {
          chat: {
            where: { senderId: { not: userId }, isRead: false }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  const result = await Promise.all(tasks.map(async (task) => {
    const otherUser = task.clientId === userId ? task.freelancer : task.client;
    let otherUserOnline = false;
    if (otherUser) {
      otherUserOnline = await isUserOnline(otherUser.id);
    }
    return {
      taskId:       task.id,
      taskTitle:    task.title,
      taskStatus:   task.status,
      otherUser:    otherUser ? { ...otherUser, isOnline: otherUserOnline } : null,
      lastMessage:  task.chat[0] || null,
      unreadCount:  task._count.chat,
    };
  }));

  return result;
}

module.exports = {
  sendMessage,
  getMessages,
  getConversations
};
