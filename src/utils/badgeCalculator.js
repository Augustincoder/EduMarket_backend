const prisma = require('../config/prisma');
const logger = require('./logger');

/**
 * Job that calculates and updates user badges based on their activity
 */
async function calculateBadges() {
  logger.info('Running badge calculator job...');
  try {
    // 1. Reset TOP_SELLER and RISING_STAR badges
    await prisma.user.updateMany({
      where: {
        badge: { in: ['TOP_SELLER', 'RISING_STAR'] }
      },
      data: { badge: 'NEWBIE' }
    });

    // 2. Find TOP_SELLERs (e.g., top 10 users with highest rating and at least 5 completed tasks)
    const topSellers = await prisma.user.findMany({
      where: {
        role: 'USER',
        ratingCount: { gte: 5 }
      },
      orderBy: [
        { ratingSum: 'desc' },
        { ratingCount: 'desc' }
      ],
      take: 10,
      select: { id: true }
    });

    if (topSellers.length > 0) {
      const topSellerIds = topSellers.map(u => u.id);
      await prisma.user.updateMany({
        where: { id: { in: topSellerIds } },
        data: { badge: 'TOP_SELLER' }
      });
    }

    // 3. Find EXPERT (e.g., consistently high rating > 4.8 over many tasks)
    // For MVP, we can keep it simple: Rating count > 20 and average > 4.8
    // Average = ratingSum / ratingCount
    // => ratingSum > 4.8 * ratingCount
    const allUsers = await prisma.user.findMany({
      where: {
        role: 'USER',
        ratingCount: { gte: 20 },
        badge: { not: 'TOP_SELLER' } // Don't override TOP_SELLER
      },
      select: { id: true, ratingSum: true, ratingCount: true }
    });

    const expertIds = allUsers
      .filter(u => (u.ratingSum / u.ratingCount) >= 4.8)
      .map(u => u.id);

    if (expertIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: expertIds } },
        data: { badge: 'EXPERT' }
      });
    }

    logger.info(`Badge calculator finished. Assigned ${topSellers.length} TOP_SELLERs and ${expertIds.length} EXPERTs.`);
  } catch (error) {
    logger.error(`Error in badge calculator job: ${error.message}`);
  }
}

module.exports = {
  calculateBadges
};
