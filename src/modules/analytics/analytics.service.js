const prisma = require('../../config/prisma');

/**
 * Get personal stats for the current user
 */
async function getPersonalStats(userId, requestedRole) {
  let role = requestedRole;
  if (!role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isFreelancer: true }
    });
    role = user?.isFreelancer ? 'FREELANCER' : 'CLIENT';
  }

  if (role === 'FREELANCER') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [tasksDone, totalEarnings, thisMonthEarnings, frozenEarnings, activeBids, recentCompleted] = await Promise.all([
      prisma.task.count({ where: { freelancerId: userId, status: 'COMPLETED' } }),
      prisma.task.aggregate({
        where: { freelancerId: userId, status: 'COMPLETED' },
        _sum: { agreedPrice: true }
      }),
      prisma.task.aggregate({
        where: {
          freelancerId: userId,
          status: 'COMPLETED',
          completedAt: { gte: startOfMonth }
        },
        _sum: { agreedPrice: true }
      }),
      prisma.task.aggregate({
        where: {
          freelancerId: userId,
          status: { in: ['ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW'] }
        },
        _sum: { agreedPrice: true }
      }),
      prisma.bid.count({
        where: {
          freelancerId: userId,
          isAccepted: false,
          task: { status: 'OPEN' }
        }
      }),
      prisma.task.findMany({
        where: { freelancerId: userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          agreedPrice: true,
          completedAt: true,
          category: true
        }
      })
    ]);

    // Calculate weekly earnings (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push({
        date: d,
        label: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        amount: 0
      });
    }

    const startOf7Days = last7Days[0].date;
    const completedLast7Days = await prisma.task.findMany({
      where: {
        freelancerId: userId,
        status: 'COMPLETED',
        completedAt: { gte: startOf7Days }
      },
      select: {
        agreedPrice: true,
        completedAt: true
      }
    });

    for (const task of completedLast7Days) {
      if (task.completedAt) {
        const taskDateStr = new Date(task.completedAt).toDateString();
        const day = last7Days.find(d => d.date.toDateString() === taskDateStr);
        if (day) {
          day.amount += task.agreedPrice || 0;
        }
      }
    }

    const weeklyEarnings = last7Days.map(d => ({ label: d.label, amount: d.amount }));

    // Category breakdown
    const completedTasks = await prisma.task.findMany({
      where: { freelancerId: userId, status: 'COMPLETED' },
      select: { category: true, agreedPrice: true }
    });

    const categoryMap = {};
    for (const t of completedTasks) {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + (t.agreedPrice || 0);
    }

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      category: cat,
      amount: categoryMap[cat]
    }));

    return {
      completedTasks: tasksDone,
      totalEarned: totalEarnings._sum.agreedPrice || 0,
      thisMonthEarned: thisMonthEarnings._sum.agreedPrice || 0,
      frozenEarned: frozenEarnings._sum.agreedPrice || 0,
      activeBids,
      recentCompleted,
      weeklyEarnings,
      categoryBreakdown
    };
  } else {
    const [tasksCreated, totalSpent, openTasks, inProgressTasks, inReviewTasks] = await Promise.all([
      prisma.task.count({ where: { clientId: userId } }),
      prisma.task.aggregate({
        where: { clientId: userId, status: 'COMPLETED' },
        _sum: { agreedPrice: true }
      }),
      prisma.task.count({ where: { clientId: userId, status: 'OPEN' } }),
      prisma.task.count({ where: { clientId: userId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { clientId: userId, status: 'IN_REVIEW' } })
    ]);

    return {
      createdTasks: tasksCreated,
      totalSpent: totalSpent._sum.agreedPrice || 0,
      openTasks,
      inProgressTasks,
      inReviewTasks
    };
  }
}

module.exports = {
  getPersonalStats
};
