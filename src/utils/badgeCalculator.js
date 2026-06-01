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
    let hasMore = true;
    let nextCursor = null;
    let expertCount = 0;

    while (hasMore) {
      const usersBatch = await prisma.user.findMany({
        where: {
          role: 'USER',
          ratingCount: { gte: 20 },
          badge: { not: 'TOP_SELLER' }
        },
        select: { id: true, ratingSum: true, ratingCount: true },
        take: 1000,
        skip: nextCursor ? 1 : 0,
        cursor: nextCursor ? { id: nextCursor } : undefined,
        orderBy: { id: 'asc' }
      });

      if (usersBatch.length === 0) {
        hasMore = false;
        break;
      }

      const expertIds = usersBatch
        .filter(u => (u.ratingSum / u.ratingCount) >= 4.8)
        .map(u => u.id);

      if (expertIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: expertIds } },
          data: { badge: 'EXPERT' }
        });
        expertCount += expertIds.length;
      }

      if (usersBatch.length < 1000) {
        hasMore = false;
      } else {
        nextCursor = usersBatch[usersBatch.length - 1].id;
      }
    }

    logger.info(`Badge calculator finished. Assigned ${topSellers.length} TOP_SELLERs and ${expertCount} EXPERTs.`);
  } catch (error) {
    logger.error(`Error in badge calculator job: ${error.message}`);
  }
}

module.exports = {
  calculateBadges
};
