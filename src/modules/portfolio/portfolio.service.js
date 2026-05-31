const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Add a new item to user's portfolio
 */
async function addPortfolioItem(userId, data) {
  const { title, fileId } = data;

  // Enforce limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVip: true, _count: { select: { portfolioItems: true } } }
  });

  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);

  const maxLimit = user.isVip ? 20 : 2;

  if (user._count.portfolioItems >= maxLimit) {
    if (!user.isVip) {
      throw new AppError(`Oddiy foydalanuvchilar maksimal ${maxLimit} ta portfolio qo'sha oladi. Ko'proq qo'shish uchun VIP sotib oling!`, 403);
    } else {
      throw new AppError(`VIP foydalanuvchilar maksimal ${maxLimit} ta portfolio qo'sha oladi. Limit to'lgan.`, 403);
    }
  }

  return prisma.portfolioItem.create({
    data: {
      userId,
      title,
      fileId
    }
  });
}

/**
 * Delete a portfolio item
 */
async function deletePortfolioItem(itemId, userId) {
  const item = await prisma.portfolioItem.findUnique({
    where: { id: itemId }
  });

  if (!item) throw new AppError('Portfolio topilmadi', 404);
  if (item.userId !== userId) throw new AppError('Ruxsat yo\'q', 403);

  return prisma.portfolioItem.delete({
    where: { id: itemId }
  });
}

/**
 * Get all portfolio items of a user
 */
async function getUserPortfolio(targetUserId) {
  return prisma.portfolioItem.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  addPortfolioItem,
  deletePortfolioItem,
  getUserPortfolio
};
