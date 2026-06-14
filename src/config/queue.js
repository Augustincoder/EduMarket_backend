const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const chatQueue = new Queue('chat_messages', { connection });

async function initWorkers() {
  const prisma = require('./prisma');
  const notificationService = require('../modules/notification/notification.service');
  const { isUserOnline } = require('./socket');

  const worker = new Worker('chat_messages', async job => {
    if (job.name === 'save_message') {
      const { message, participants, taskId, chatRoomId, senderId } = job.data;
      
      // 1. Save message to DB
      try {
        await prisma.chatMessage.create({
          data: {
            id: message.id, // Pre-generated UUID
            chatRoomId: message.chatRoomId,
            senderId: message.senderId,
            type: message.type,
            content: message.content,
            fileId: message.fileId,
            fileType: message.fileType,
            fileName: message.fileName,
            isSecureFile: message.isSecureFile,
            replyToId: message.replyToId,
            metadata: message.metadata,
            createdAt: message.createdAt
          }
        });
      } catch (err) {
        if (err.code === 'P2002') {
          logger.info(`Message ${message.id} already exists in DB, skipping...`);
        } else {
          logger.error(`Failed to save message to DB in worker: ${err.message}`);
          throw err; // retry
        }
      }

      // 2. Offline Notifications
      if (!participants) return;
      
      const senderName = message.sender?.fullname || 'Foydalanuvchi';

      for (const p of participants) {
        if (p.userId === senderId) continue;
        
        try {
          const isOnline = await isUserOnline(p.userId);
          if (!isOnline) {
            await notificationService.notifyChatMessage(p.userId, senderName, taskId || chatRoomId);
          }
        } catch (err) {
          logger.error(`Offline notification error in worker for user ${p.userId}: ${err.message}`);
        }
      }
    }
  }, { 
    connection,
    concurrency: 5 // Process 5 messages simultaneously
  });

  worker.on('completed', job => {
    logger.debug(`Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed with error ${err.message}`);
  });
}

module.exports = {
  chatQueue,
  initWorkers
};
