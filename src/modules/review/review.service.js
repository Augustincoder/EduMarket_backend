const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { isLegitimateReview, logFraudSuspicion } = require('../../utils/antifraud');
const { TASK_STATUS } = require('../task/task.stateMachine');

/**
 * Leave a review for a completed task
 */
async function createReview(taskId, fromUserId, data) {
  const { rating, comment } = data;

  if (rating < 1 || rating > 5) {
    throw new AppError('Baho 1 dan 5 gacha bo\'lishi kerak', 400);
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task || task.deletedAt) {
    throw new AppError('Vazifa topilmadi', 404);
  }

  if (task.status !== TASK_STATUS.COMPLETED) {
    throw new AppError('Faqat yakunlangan vazifalar uchun baho qoldirish mumkin', 400);
  }

  // Determine who is being reviewed and ensure counterpart exists
  let toUserId;
  if (fromUserId === task.clientId) {
    if (!task.freelancerId) {
      throw new AppError('Freelancer hali tayinlanmagan, baho qoldirish mumkin emas', 400);
    }
    toUserId = task.freelancerId;
  } else if (fromUserId === task.freelancerId) {
    toUserId = task.clientId;
  } else {
    throw new AppError('Ushbu vazifaga aloqangiz yo\'q', 403);
  }

  // Check if review already exists
  const existingReview = await prisma.review.findUnique({
    where: {
      taskId_fromUserId: { taskId, fromUserId }
    }
  });

  if (existingReview) {
    throw new AppError('Siz allaqachon baho qoldirgansiz', 400);
  }

  // Anti-fraud check
  const isLegit = isLegitimateReview(task);
  
  if (!isLegit) {
    await logFraudSuspicion(fromUserId, toUserId, 'FAKE_REVIEW', { 
      taskId, 
      reason: 'Task in progress for less than 24h' 
    });
  }

  // Create review using a transaction to update user rating safely
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        taskId,
        fromUserId,
        toUserId,
        rating,
        comment,
        isCountedInRating: isLegit
      }
    });

    // Update user rating only if review is legit
    if (isLegit) {
      await tx.user.update({
        where: { id: toUserId },
        data: {
          ratingSum: { increment: rating },
          ratingCount: { increment: 1 }
        }
      });
    }

    return review;
  });
}

/**
 * Get reviews left for a user
 */
async function getUserReviews(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: {
        toUserId: userId,
        isCountedInRating: true // Faqat legal izohlarni ko'rsatamiz
      },
      include: {
        fromUser: {
          select: { id: true, fullname: true, avatarUrl: true, isVip: true, badge: true }
        },
        task: {
          select: { id: true, title: true, category: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit, 10)
    }),
    prisma.review.count({
      where: {
        toUserId: userId,
        isCountedInRating: true
      }
    })
  ]);

  return { reviews, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get tasks where the user needs to leave a review
 */
async function getPendingReviews(userId) {
  // Find all COMPLETED tasks where the user is either client or freelancer,
  // and there is no Review by this user for this task.
  return prisma.task.findMany({
    where: {
      status: TASK_STATUS.COMPLETED,
      OR: [
        { clientId: userId },
        { freelancerId: userId }
      ],
      reviews: {
        none: {
          fromUserId: userId
        }
      }
    },
    include: {
      client: { select: { id: true, fullname: true, avatarUrl: true } },
      freelancer: { select: { id: true, fullname: true, avatarUrl: true } }
    },
    orderBy: { completedAt: 'desc' }
  });
}

module.exports = {
  createReview,
  getUserReviews,
  getPendingReviews
};
