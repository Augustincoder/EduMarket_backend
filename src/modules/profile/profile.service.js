const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Get user profile data
 */
async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      telegramId: true,
      username: true,
      fullname: true,
      avatarUrl: true,
      role: true,
      bio: true,
      skills: true,
      badge: true,
      isVip: true,
      vipExpiresAt: true,
      ratingSum: true,
      ratingCount: true,
      completionRate: true,
      avgResponseHrs: true,
      referralCode: true,
      referredBy: true,
      referralEarned: true,
      streakCount: true,
      xp: true,
      achievements: true,
      isFreelancer: true,
      freelancerCategories: true,
      freelancerBio: true,
      freelancerExperience: true,
      createdAt: true,
      _count: {
        select: {
          freelancerTasks: { where: { status: 'COMPLETED' } }
        }
      },
      portfolioItems: {
        select: {
          id: true,
          title: true,
          fileId: true,
          createdAt: true
        }
      }
    }
  });

  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);
  return user;
}

/**
 * Update user profile
 */
async function updateProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      username: true,
      fullname: true,
      bio: true,
      skills: true,
      badge: true,
      isVip: true,
      isFreelancer: true,
      freelancerCategories: true,
      freelancerBio: true,
      freelancerExperience: true
    }
  });
  
  return user;
}

/**
 * Get monthly leaderboard (Top 10 Freelancers)
 */
async function getLeaderboard() {
  // Sort by highest rating sum, then highest task completed count
  const topUsers = await prisma.user.findMany({
    where: { 
      isFreelancer: true,
      isBanned: false,
      deletedAt: null
    },
    orderBy: [
      { ratingSum: 'desc' },
      { ratingCount: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 10,
    select: {
      id: true,
      fullname: true,
      avatarUrl: true,
      isVip: true,
      badge: true,
      ratingSum: true,
      ratingCount: true,
      skills: true,
      _count: {
        select: {
          freelancerTasks: { where: { status: 'COMPLETED' } }
        }
      }
    }
  });

  return topUsers;
}

/**
 * Update user's push token for FCM
 */
async function updatePushToken(userId, pushToken) {
  return prisma.user.update({
    where: { id: userId },
    data: { pushToken }
  });
}

module.exports = {
  getProfile,
  updateProfile,
  getLeaderboard,
  updatePushToken
};
