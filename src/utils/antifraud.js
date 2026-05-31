const prisma = require('../config/prisma');

/**
 * Anti-fraud check: Checks if a review is legitimate based on task duration.
 * Rule: A task must be in IN_PROGRESS state for at least 24 hours 
 * to count towards a user's rating.
 * 
 * @param {object} task - The task object including state transition timestamps
 * @returns {boolean} True if the review is legitimate and should count
 */
function isLegitimateReview(task) {
  // If task never went in progress, review shouldn't affect rating
  if (!task.inProgressAt) return false;

  // If completed time is available, check duration
  const endTime = task.completedAt || new Date();
  const durationMs = endTime.getTime() - task.inProgressAt.getTime();
  
  // 24 hours in milliseconds
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  return durationMs >= TWENTY_FOUR_HOURS;
}

/**
 * Log suspicious activity for admin review
 */
async function logFraudSuspicion(suspectId, targetId, type, details) {
  await prisma.fraudLog.create({
    data: {
      suspectId,
      targetId,
      type,
      details
    }
  });
}

/**
 * Detect if a freelancer is spamming bids
 * Rule: More than 10 bids in the last 1 hour
 */
async function detectSpamBids(freelancerId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentBidsCount = await prisma.bid.count({
    where: {
      freelancerId,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentBidsCount >= 10) {
    await logFraudSuspicion(freelancerId, freelancerId, 'SPAM_BIDS', {
      reason: '1 soat ichida 10 dan ortiq taklif yuborildi',
      bidsCount: recentBidsCount
    });
    return true; // Is Spam
  }
  return false;
}

module.exports = {
  isLegitimateReview,
  logFraudSuspicion,
  detectSpamBids
};
