const cron = require('node-cron');
const { runDeadlineCheck } = require('../jobs/deadlineChecker');
const { calculateBadges } = require('./badgeCalculator');
const logger = require('./logger');

/**
 * Initialize all scheduled cron jobs
 */
function initScheduler() {
  logger.info('Initializing job scheduler...');

  // 1. Deadline Checker: Runs every hour
  cron.schedule('0 * * * *', () => {
    runDeadlineCheck();
  });

  // 1.5 Auto-complete IN_REVIEW tasks after 48 hours: Runs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const prisma = require('../config/prisma');
      const { autoCompleted } = require('../modules/notification/notification.service');
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const staleTasks = await prisma.task.findMany({
        where: { status: 'IN_REVIEW', inReviewAt: { lte: cutoff } },
        include: { client: true, freelancer: true },
      });

      if (staleTasks.length === 0) return;

      const staleTaskIds = staleTasks.map(t => t.id);

      // Bulk update first to prevent deadlock and speed up DB operations
      await prisma.task.updateMany({
        where: { id: { in: staleTaskIds } },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Send notifications in chunks
      const chunkSize = 50;
      for (let i = 0; i < staleTasks.length; i += chunkSize) {
        const chunk = staleTasks.slice(i, i + chunkSize);
        await Promise.allSettled(
          chunk.map(async (task) => {
            await autoCompleted(task);
            logger.info(`Auto-completed task #${task.id}`);
          })
        );
      }
    } catch (err) {
      logger.error(`Auto-complete scheduler error: ${err.message}`);
    }
  });

  // 2. Badge Calculator: Runs every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    calculateBadges();
  });

  // 3. Clear expired task promotions: Runs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const prisma = require('../config/prisma');
      const now = new Date();
      
      const result = await prisma.task.updateMany({
        where: { promotedUntil: { lt: now } },
        data: { promotedUntil: null }
      });

      if (result.count > 0) {
        logger.info(`Cleared ${result.count} expired task promotions.`);
      }
    } catch (err) {
      logger.error(`Promotion cleanup scheduler error: ${err.message}`);
    }
  });

  // Phase 14: Escrow timeout checker would be added here

  logger.info('Job scheduler initialized successfully.');
}

module.exports = {
  initScheduler
};
