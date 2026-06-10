const { AppError } = require('../../middleware/errorHandler');
const notificationService = require('../notification/notification.service');
const { TASK_STATUS, validateTransition } = require('../task/task.stateMachine');
const { detectSpamBids } = require('../../utils/antifraud');
const bidRepository = require('./bid.repository');
const taskRepository = require('../task/task.repository');
const prisma = require('../../config/prisma'); // Keep for user queries temporarily if needed

/**
 * Place a new bid on a task
 */
async function createBid(taskId, freelancerId, data) {
  const task = await taskRepository.findById(taskId);
  
  if (!task || task.deletedAt) {
    throw new AppError('Vazifa topilmadi', 404);
  }
  
  if (task.status !== TASK_STATUS.OPEN) {
    throw new AppError('Ushbu vazifaga taklif berish yopilgan', 400);
  }

  if (task.clientId === freelancerId) {
    throw new AppError('O\'z vazifangizga taklif bera olmaysiz', 400);
  }

  // Check if price is within budget
  if (data.proposedPrice > task.priceMax) {
    throw new AppError(`Maksimal byudjet ${task.priceMax} so'm`, 400);
  }

  // Anti-fraud spam check
  const isSpam = await detectSpamBids(freelancerId);
  if (isSpam) {
    throw new AppError('Juda ko\'p taklif yubordingiz. Iltimos 1 soat kuting.', 429);
  }

  // Upsert bid via Repository
  const bid = await bidRepository.upsert(taskId, freelancerId, data);

  // Notify client of new bid
  const freelancer = await prisma.user.findUnique({ where: { id: freelancerId }, select: { fullname: true } });
  await notificationService.notifyNewBid(task.clientId, freelancer.fullname, data.proposedPrice, taskId);

  return bid;
}

/**
 * Get all bids for a task (Blind Bidding implemented)
 */
async function getTaskBids(taskId, userId) {
  const task = await taskRepository.findById(taskId);
  
  if (!task) throw new AppError('Vazifa topilmadi', 404);

  const bids = await bidRepository.findByTask(taskId, {
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
  });

  // Sort: VIP first, then by average rating DESC
  bids.sort((a, b) => {
    if (a.freelancer.isVip && !b.freelancer.isVip) return -1;
    if (!a.freelancer.isVip && b.freelancer.isVip) return 1;

    const ratingA = a.freelancer.ratingCount > 0 ? (a.freelancer.ratingSum / a.freelancer.ratingCount) : 0;
    const ratingB = b.freelancer.ratingCount > 0 ? (b.freelancer.ratingSum / b.freelancer.ratingCount) : 0;

    return ratingB - ratingA;
  });

  // Blind Bidding System
  const isClient = task.clientId === userId;
  
  const redactedBids = bids.map(bid => {
    const isOwner = bid.freelancerId === userId;
    if (!isClient && !isOwner) {
      return {
        ...bid,
        proposedPrice: null,
        message: '[Raqobat uchun yashirilgan]',
        counterPrice: null,
        counterMessage: null
      };
    }
    return bid;
  });

  return redactedBids;
}

/**
 * Client accepts a bid
 */
async function acceptBid(taskId, bidId, clientId) {
  const task = await taskRepository.findById(taskId);
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== clientId) throw new AppError('Ruxsat yo\'q', 403);
  
  validateTransition(task.status, TASK_STATUS.ASSIGNED);

  const bid = await bidRepository.findById(bidId);
  if (!bid || bid.taskId !== taskId) throw new AppError('Taklif topilmadi', 404);

  const agreedPrice = bid.counterAccepted ? (bid.counterPrice || bid.proposedPrice) : bid.proposedPrice;
  
  try {
    const updatedTask = await bidRepository.acceptBidTransaction(taskId, bidId, bid.freelancerId, agreedPrice);
    
    // Notify Freelancer
    await notificationService.notifyTaskAssigned(bid.freelancerId, task.title, taskId);
    return updatedTask;
  } catch (err) {
    throw new AppError(err.message, 400);
  }
}

/**
 * Client sends a counter-offer
 */
async function createCounterOffer(bidId, clientId, data) {
  const bid = await bidRepository.findById(bidId, { task: true });

  if (!bid) throw new AppError('Taklif topilmadi', 404);
  if (bid.task.clientId !== clientId) throw new AppError('Ruxsat yo\'q', 403);
  if (bid.task.status !== TASK_STATUS.OPEN) throw new AppError('Vazifa ochiq emas', 400);

  return bidRepository.update(bidId, {
    counterPrice: data.counterPrice,
    counterMessage: data.counterMessage,
    counterAt: new Date()
  });
}

/**
 * Freelancer accepts counter-offer
 */
async function acceptCounterOffer(bidId, freelancerId) {
  const bid = await bidRepository.findById(bidId, { task: true });
  
  if (!bid) throw new AppError('Taklif topilmadi', 404);
  if (bid.freelancerId !== freelancerId) throw new AppError('Ruxsat yo\'q', 403);
  if (!bid.counterPrice) throw new AppError('Counter-offer mavjud emas', 400);

  if (bid.task.status !== TASK_STATUS.OPEN) {
    throw new AppError('Vazifa ochiq emas', 400);
  }

  try {
    const updatedTask = await bidRepository.acceptCounterOfferTransaction(bid.taskId, bidId, freelancerId, bid.counterPrice);
    
    await notificationService.notifyTaskAssigned(freelancerId, bid.task.title, bid.taskId);
    return updatedTask;
  } catch (err) {
    throw new AppError(err.message, 400);
  }
}

module.exports = {
  createBid,
  getTaskBids,
  acceptBid,
  createCounterOffer,
  acceptCounterOffer
};
