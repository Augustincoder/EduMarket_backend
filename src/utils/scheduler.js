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

      for (const task of staleTasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        await autoCompleted(task);
        logger.info(`Auto-completed task #${task.id}`);
      }
    } catch (err) {
      logger.error(`Auto-complete scheduler error: ${err.message}`);
    }
  });

  // 2. Badge Calculator: Runs every day at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    calculateBadges();
  });

  // Phase 14: Escrow timeout checker would be added here

  logger.info('Job scheduler initialized successfully.');
}

module.exports = {
  initScheduler
};
