const prisma = require('../config/prisma');
const { notifyDeadlineApproaching } = require('../modules/notification/notification.service');
const { TASK_STATUS } = require('../modules/task/task.stateMachine');
const logger = require('../utils/logger');

/**
 * Job that checks for tasks approaching their deadline
 * and sends reminders to the assigned freelancer.
 */
async function runDeadlineCheck() {
  logger.info('Running deadline checker job...');
  try {
    const now = new Date();
    // 24 hours from now
    const warningTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // 23 hours from now (to avoid sending duplicate notifications if job runs hourly)
    const lowerBound = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    const tasksToWarn = await prisma.task.findMany({
      where: {
        status: TASK_STATUS.IN_PROGRESS,
        deadline: {
          lte: warningTime,
          gt: lowerBound
        },
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        freelancerId: true
      }
    });

    for (const task of tasksToWarn) {
      if (task.freelancerId) {
        await notifyDeadlineApproaching(task.freelancerId, task.title, task.id);
      }
    }

    logger.info(`Deadline checker finished. Reminded ${tasksToWarn.length} freelancers.`);
  } catch (error) {
    logger.error(`Error in deadline checker job: ${error.message}`);
  }
}

module.exports = {
  runDeadlineCheck
};
