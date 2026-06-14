const prisma = require('../config/prisma');

async function runChatMigration() {
  try {
    const orphanMessages = await prisma.$queryRaw`
      SELECT id, task_id, sender_id 
      FROM chat_messages 
      WHERE chat_room_id IS NULL AND task_id IS NOT NULL
    `;

    if (!orphanMessages || orphanMessages.length === 0) {
      return;
    }

    console.log(`[Migration] Found ${orphanMessages.length} orphaned messages. Starting migration...`);

    const taskGroups = {};
    for (const msg of orphanMessages) {
      if (!taskGroups[msg.task_id]) {
        taskGroups[msg.task_id] = new Set();
      }
      if (msg.sender_id) {
        taskGroups[msg.task_id].add(msg.sender_id);
      }
    }

    for (const [taskId, senders] of Object.entries(taskGroups)) {
      let isTask = false;
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) isTask = true;

      let roomType = isTask ? 'TASK_ROOM' : 'DIRECT';
      let roomName = isTask ? task.title : null;
      let targetTaskId = isTask ? taskId : null;

      const newRoom = await prisma.chatRoom.create({
        data: {
          type: roomType,
          name: roomName,
          taskId: targetTaskId
        }
      });

      const participantIds = Array.from(senders);
      if (!isTask && participantIds.length === 1 && !participantIds.includes(taskId)) {
        // Assume taskId is actually the other user's ID
        participantIds.push(taskId);
      } else if (!isTask && participantIds.length === 0) {
        participantIds.push(taskId);
      }

      for (const pId of participantIds) {
        // Ensure user exists before adding participant
        const user = await prisma.user.findUnique({ where: { id: pId } });
        if (user) {
          await prisma.chatParticipant.create({
            data: {
              chatRoomId: newRoom.id,
              userId: pId,
              role: 'MEMBER'
            }
          });
        }
      }

      await prisma.$executeRaw`
        UPDATE chat_messages 
        SET chat_room_id = ${newRoom.id}
        WHERE task_id = ${taskId} AND chat_room_id IS NULL
      `;

      console.log(`[Migration] Migrated legacy chat ${taskId} to room ${newRoom.id}`);
    }

    console.log('[Migration] Chat migration completed successfully.');
  } catch (error) {
    console.error('[Migration] Failed:', error);
  }
}

module.exports = runChatMigration;
