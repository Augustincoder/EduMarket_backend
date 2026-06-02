const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const notificationService = require('../notification/notification.service');
const { TASK_STATUS, validateTransition } = require('../task/task.stateMachine');
const { detectSpamBids } = require('../../utils/antifraud');

/**
 * Place a new bid on a task
 */
async function createBid(taskId, freelancerId, data) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  
  if (!task || task.deletedAt) {
    throw new AppError('Vazifa topilmadi', 404);
  }
  
  if (task.status !== TASK_STATUS.OPEN) {
    throw new AppError('Ushbu vazifaga taklif berish yopilgan', 400);
  }

  if (task.clientId === freelancerId) {
    throw new AppError('O\'z vazifangizga taklif bera olmaysiz', 400);
  }

  // Check if price is within budget (Soft limit - we can allow bidding outside but warn)
  if (data.proposedPrice > task.priceMax) {
    // Just a business logic choice. Here we strictly enforce it.
    throw new AppError(`Maksimal byudjet ${task.priceMax} so'm`, 400);
  }

  // Anti-fraud spam check
  const isSpam = await detectSpamBids(freelancerId);
  if (isSpam) {
    throw new AppError('Juda ko\'p taklif yubordingiz. Iltimos 1 soat kuting.', 429);
  }

  // Upsert bid (allows user to update their bid if they bid again)
  const bid = await prisma.bid.upsert({
    where: {
      taskId_freelancerId: { taskId, freelancerId }
    },
    update: {
      message: data.message,
      proposedPrice: data.proposedPrice,
    },
    create: {
      taskId,
      freelancerId,
      message: data.message,
      proposedPrice: data.proposedPrice,
    }
  });

  // Notify client of new bid
  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { fullname: true } });
  await notificationService.notifyNewBid(task.clientId, freelancer.fullname, data.proposedPrice, taskId);

  return bid;
}

/**
 * Get all bids for a task (Client only)
 * VIP freelancers are sorted first, then by rating
 */
async function getTaskBids(taskId, clientId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== clientId) throw new AppError('Takliflarni faqat vazifa egasi ko\'rishi mumkin', 403);

  const bids = await prisma.bid.findMany({
    where: { taskId },
    include: {
      freelancer: {
        select: {
          id: true,
          fullname: true,
          avatarUrl: true,
          isVip: true,
          badge: true,
          ratingSum: true,
          ratingCount: true,
          skills: true
        }
      }
    }
  });

  // Sort: VIP first, then by average rating DESC
  bids.sort((a, b) => {
    if (a.freelancer.isVip && !b.freelancer.isVip) return -1;
    if (!a.freelancer.isVip && b.freelancer.isVip) return 1;

    const ratingA = a.freelancer.ratingCount > 0 ? (a.freelancer.ratingSum / a.freelancer.ratingCount) : 0;
    const ratingB = b.freelancer.ratingCount > 0 ? (b.freelancer.ratingSum / b.freelancer.ratingCount) : 0;

    return ratingB - ratingA;
  });

  return bids;
}

/**
 * Client accepts a bid
 * Transitions task to ASSIGNED and records agreed price
 */
async function acceptBid(taskId, bidId, clientId) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError('Vazifa topilmadi', 404);
    if (task.clientId !== clientId) throw new AppError('Ruxsat yo\'q', 403);
    
    validateTransition(task.status, TASK_STATUS.ASSIGNED);

    const bid = await tx.bid.findUnique({ where: { id: bidId } });
    if (!bid || bid.taskId !== taskId) throw new AppError('Taklif topilmadi', 404);

    // 1. Update task state atomically using updateMany to prevent race conditions
    const agreedPrice = bid.counterAccepted ? (bid.counterPrice || bid.proposedPrice) : bid.proposedPrice;
    
    const updateResult = await tx.task.updateMany({
      where: { 
        id: taskId,
        status: TASK_STATUS.OPEN
      },
      data: {
        status: TASK_STATUS.ASSIGNED,
        freelancerId: bid.freelancerId,
        agreedPrice,
        assignedAt: new Date()
      }
    });

    if (updateResult.count === 0) {
      throw new AppError('Ushbu vazifa allaqachon boshqa ijrochiga tayinlangan yoki yopilgan', 400);
    }

    // 2. Mark bid as accepted
    await tx.bid.update({
      where: { id: bidId },
      data: { isAccepted: true }
    });

    // Retrieve the actual updated task
    const updatedTask = await tx.task.findUnique({
      where: { id: taskId }
    });

    // Phase 14: Escrow logic integration goes here
    
    // Send Notification to Freelancer
    await notificationService.notifyTaskAssigned(bid.freelancerId, task.title, taskId);

    return updatedTask;
  });
}

/**
 * Client sends a counter-offer (Phase 14)
 */
async function createCounterOffer(bidId, clientId, data) {
  const bid = await prisma.bid.findUnique({
    where: { id: bidId },
    include: { task: true }
  });

  if (!bid) throw new AppError('Taklif topilmadi', 404);
  if (bid.task.clientId !== clientId) throw new AppError('Ruxsat yo\'q', 403);
  if (bid.task.status !== TASK_STATUS.OPEN) throw new AppError('Vazifa ochiq emas', 400);

  return prisma.bid.update({
    where: { id: bidId },
    data: {
      counterPrice: data.counterPrice,
      counterMessage: data.counterMessage,
      counterAt: new Date()
    }
  });
}

/**
 * Freelancer accepts counter-offer (Phase 14)
 */
async function acceptCounterOffer(bidId, freelancerId) {
  const bid = await prisma.bid.findUnique({ where: { id: bidId }, include: { task: true } });
  
  if (!bid) throw new AppError('Taklif topilmadi', 404);
  if (bid.freelancerId !== freelancerId) throw new AppError('Ruxsat yo\'q', 403);
  if (!bid.counterPrice) throw new AppError('Counter-offer mavjud emas', 400);

  // Ensure task is still open
  if (bid.task.status !== TASK_STATUS.OPEN) {
    throw new AppError('Vazifa ochiq emas', 400);
  }

  return prisma.$transaction(async (tx) => {
    // Update task to assigned state with agreed price
    const updateResult = await tx.task.updateMany({
      where: { id: bid.taskId, status: TASK_STATUS.OPEN },
      data: {
        status: TASK_STATUS.ASSIGNED,
        freelancerId: freelancerId,
        agreedPrice: bid.counterPrice,
        assignedAt: new Date()
      }
    });
    if (updateResult.count === 0) {
      throw new AppError('Vazifa allaqachon tayinlangan yoki yopilgan', 400);
    }

    // Mark counter offer as accepted
    await tx.bid.update({
      where: { id: bidId },
      data: { counterAccepted: true }
    });

    // Notify client about assignment
    await notificationService.notifyTaskAssigned(freelancerId, bid.task.title, bid.taskId);

    // Return updated task
    return tx.task.findUnique({ where: { id: bid.taskId } });
  });
}

module.exports = {
  createBid,
  getTaskBids,
  acceptBid,
  createCounterOffer,
  acceptCounterOffer
};
