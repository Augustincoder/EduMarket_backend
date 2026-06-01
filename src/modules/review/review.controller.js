const reviewService = require('./review.service');

/**
 * Leave a review for a task
 */
async function createReview(req, res) {
  const taskId = req.params.taskId;
  const fromUserId = req.user.userId;
  
  const review = await reviewService.createReview(taskId, fromUserId, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Baho muvaffaqiyatli qoldirildi',
    data: {
      review,
      warning: !review.isCountedInRating ? 'Ushbu baho reytingga qo\'shilmadi (anti-fraud)' : undefined
    }
  });
}

/**
 * Get reviews left for a user
 */
async function getUserReviews(req, res) {
  const userId = req.params.userId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const data = await reviewService.getUserReviews(userId, page, limit);

  res.json({
    success: true,
    data
  });
}

/**
 * Get tasks where user needs to leave a review
 */
async function getPendingReviews(req, res) {
  const tasks = await reviewService.getPendingReviews(req.user.userId);
  
  res.json({
    success: true,
    data: tasks
  });
}

module.exports = {
  createReview,
  getUserReviews,
  getPendingReviews
};
