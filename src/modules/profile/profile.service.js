const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const crypto = require('crypto');
const util = require('util');
const randomBytesAsync = util.promisify(crypto.randomBytes);

/**
 * Get user profile data
 */
async function getProfile(userId) {
  let user = await prisma.user.findUnique({
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
      isOnboardingComplete: true,
      verificationStatus: true,
      isVerifiedStudent: true,
      notifPrefs: true,
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

  // Fallback for older users missing a referral code
  if (!user.referralCode) {
    const codeBuffer = await randomBytesAsync(4);
    const code = codeBuffer.toString('hex');
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { referralCode: true }
    });
    user.referralCode = updated.referralCode;
  }

  return user;
}

/**
 * Get user's referral stats and list
 */
async function getReferrals(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralEarned: true
    }
  });

  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);

  // If code is missing, generate it
  if (!user.referralCode) {
    const codeBuffer = await randomBytesAsync(4);
    user.referralCode = codeBuffer.toString('hex');
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: user.referralCode }
    });
  }

  // Fetch referred users manually since relation doesn't exist in schema
  const referredUsers = await prisma.user.findMany({
    where: { referredBy: user.referralCode },
    select: {
      id: true,
      fullname: true,
      avatarUrl: true,
      isFreelancer: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    referralCode: user.referralCode,
    referralEarned: user.referralEarned || 0,
    totalReferrals: referredUsers.length,
    referredUsers
  };
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
      freelancerExperience: true,
      notifPrefs: true
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

/**
 * GDPR Soft Delete & Anonymize
 */
async function deleteProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);

  return prisma.$transaction(async (tx) => {
    // 1. Anonymize user data
    await tx.user.update({
      where: { id: userId },
      data: {
        fullname: 'Deleted User',
        username: null,
        avatarUrl: null,
        bio: null,
        skills: [],
        portfolioIds: [],
        freelancerBio: null,
        studentCardFileId: null,
        isBanned: true,
        banReason: 'Deleted by user (GDPR)',
        deletedAt: new Date()
      }
    });

    // 2. Anonymize chat messages
    await tx.chatMessage.updateMany({
      where: { senderId: userId },
      data: {
        content: '[Xabar o\'chirildi]',
        fileId: null,
        fileName: null
      }
    });
  });
}

module.exports = {
  getProfile,
  updateProfile,
  getLeaderboard,
  updatePushToken,
  getReferrals,
  deleteProfile
};
