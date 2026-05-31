const prisma = require('../../config/prisma');

/**
 * Get personal stats for the current user
 */
async function getPersonalStats(userId, role) {
  if (role === 'FREELANCER') {
    const [tasksDone, currentEarnings, totalEarnings, activeBids] = await Promise.all([
      prisma.task.count({ where: { freelancerId: userId, status: 'COMPLETED' } }),
      // Sum of agreedPrice for completed tasks this month could be added here
      prisma.task.aggregate({
        where: { freelancerId: userId, status: 'COMPLETED' },
        _sum: { agreedPrice: true }
      }),
      prisma.task.aggregate({
        where: { freelancerId: userId, status: 'COMPLETED' },
        _sum: { agreedPrice: true }
      }),
      prisma.bid.count({ where: { freelancerId: userId, status: 'PENDING' } })
    ]);

    return {
      completedTasks: tasksDone,
      totalEarned: totalEarnings._sum.agreedPrice || 0,
      activeBids
    };
  } else {
    const [tasksCreated, totalSpent] = await Promise.all([
      prisma.task.count({ where: { clientId: userId } }),
      prisma.task.aggregate({
        where: { clientId: userId, status: 'COMPLETED' },
        _sum: { agreedPrice: true }
      })
    ]);

    return {
      createdTasks: tasksCreated,
      totalSpent: totalSpent._sum.agreedPrice || 0
    };
  }
}

module.exports = {
  getPersonalStats
};
