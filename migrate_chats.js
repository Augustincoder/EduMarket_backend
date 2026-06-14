const prisma = require('./src/config/prisma');

async function migrate() {
  try {
    // Check if there are any messages without a chat_room_id
    const orphanMessages = await prisma.$queryRaw`
      SELECT id, task_id, sender_id 
      FROM chat_messages 
      WHERE chat_room_id IS NULL AND task_id IS NOT NULL
    `;

    if (!orphanMessages || orphanMessages.length === 0) {
      console.log('No orphaned messages found to migrate.');
      return;
    }

    console.log(`Found ${orphanMessages.length} orphaned messages.`);

    // Group by task_id to create rooms
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
      // Is taskId a user ID or a task ID? Let's check.
      let isTask = false;
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task) isTask = true;

      // If it's a task, we create a TASK_ROOM. If not, it's a user, so DIRECT.
      let roomType = isTask ? 'TASK_ROOM' : 'DIRECT';
      let roomName = isTask ? task.title : null;
      let targetTaskId = isTask ? taskId : null;

      // Create room
      const newRoom = await prisma.chatRoom.create({
        data: {
          type: roomType,
          name: roomName,
          taskId: targetTaskId
        }
      });

      // Add participants
      const participantIds = Array.from(senders);
      if (!isTask && participantIds.length === 1) {
        // If it was a direct chat but we only have 1 sender, the other is the taskId
        if (!participantIds.includes(taskId)) {
          participantIds.push(taskId);
        }
      }

      for (const pId of participantIds) {
        await prisma.chatParticipant.create({
          data: {
            chatRoomId: newRoom.id,
            userId: pId,
            role: 'MEMBER'
          }
        });
      }

      // Update messages
      await prisma.$executeRaw`
        UPDATE chat_messages 
        SET chat_room_id = ${newRoom.id}
        WHERE task_id = ${taskId} AND chat_room_id IS NULL
      `;

      console.log(`Migrated ${taskId} to room ${newRoom.id}`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
