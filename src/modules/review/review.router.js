const router = require('express').Router();
const reviewController = require('./review.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { nlpFilter } = require('../../middleware/nlpFilter');
const { reviewRateLimiter } = require('../../middleware/rateLimiter');
const { createReviewSchema } = require('./review.schema');

// POST /api/v1/reviews/task/:taskId
router.post(
  '/task/:taskId',
  requireAuth,
  reviewRateLimiter, // Max 10 reviews per hour
  validate(createReviewSchema, 'body'),
  nlpFilter, // Prevent spam/fraud in review comments
  asyncHandler(reviewController.createReview)
);

// GET /api/v1/reviews/pending
router.get(
  '/pending',
  requireAuth,
  asyncHandler(reviewController.getPendingReviews)
);

// GET /api/v1/reviews/user/:userId
router.get(
  '/user/:userId',
  asyncHandler(reviewController.getUserReviews)
);

module.exports = router;
