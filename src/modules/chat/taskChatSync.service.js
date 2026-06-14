const prisma = require('../../config/prisma');
const chatService = require('./chat.service');
const logger = require('../../utils/logger');

/**
 * Synchronize task chat room participants based on current task state.
 * Source of truth: Task (client + freelancer + accepted collaborators).
 */
async function syncTaskRoomParticipants(taskId) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        collaborators: { 
          where: { status: 'ACCEPTED' } 
        } 
      }
    });

    if (!task) return;

    const room = await prisma.chatRoom.findUnique({ where: { taskId } });
    if (!room) return; // Room will be created by getOrCreateTaskRoom if needed

    const desired = new Map();
    desired.set(task.clientId, 'OWNER');
    
    if (task.freelancerId) {
      desired.set(task.freelancerId, 'MEMBER');
    }

    task.collaborators.forEach(c => {
      if (!desired.has(c.freelancerId)) {
        desired.set(c.freelancerId, 'MEMBER');
      }
    });

    const currentParticipants = await prisma.chatParticipant.findMany({
      where: { chatRoomId: room.id }
    });

    // 1. Add missing participants
    for (const [userId, role] of desired) {
      const isAlreadyIn = currentParticipants.find(p => p.userId === userId);
      if (!isAlreadyIn) {
        await prisma.chatParticipant.create({
          data: { chatRoomId: room.id, userId, role }
        });
        await chatService.sendSystemEvent(room.id, `👋 Foydalanuvchi guruhga qo'shildi.`);
      } else if (isAlreadyIn.role !== role) {
        // Update role if needed (e.g. if someone becomes lead freelancer)
        await prisma.chatParticipant.update({
          where: { id: isAlreadyIn.id },
          data: { role }
        });
      }
    }

    // 2. Remove participants who are no longer part of the task
    for (const p of currentParticipants) {
      if (!desired.has(p.userId)) {
        await prisma.chatParticipant.delete({ where: { id: p.id } });
        await chatService.sendSystemEvent(room.id, `👋 Foydalanuvchi guruhdan chiqarildi (vazifa tarkibi o'zgardi).`);
      }
    }
  } catch (err) {
    logger.error(`Failed to sync task room participants for task ${taskId}: ${err.message}`);
  }
}

/**
 * Archive task room when task is completed or canceled.
 * Sets the room to read-only and marks as archived.
 */
async function archiveTaskRoom(taskId) {
  try {
    const room = await prisma.chatRoom.findUnique({ where: { taskId } });
    if (!room) return;

    await prisma.chatRoom.update({
      where: { id: room.id },
      data: { 
        isArchived: true,
        settings: {
          ...((room.settings && typeof room.settings === 'object') ? room.settings : {}),
          isReadOnly: true
        }
      }
    });
    
    await chatService.sendSystemEvent(room.id, `📁 Vazifa yakunlandi. Chat arxivlandi (faqat o'qish uchun).`);
  } catch (err) {
    logger.error(`Failed to archive task room for task ${taskId}: ${err.message}`);
  }
}

module.exports = {
  syncTaskRoomParticipants,
  archiveTaskRoom
};
