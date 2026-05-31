const router = require('express').Router();
const bidController = require('./bid.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { nlpFilter } = require('../../middleware/nlpFilter');
const { bidRateLimiter } = require('../../middleware/rateLimiter');
const { createBidSchema, counterOfferSchema } = require('./bid.schema');

// POST /api/v1/bids/task/:id - Freelancer places a bid
router.post(
  '/task/:id',
  requireAuth,
  bidRateLimiter, // Prevent spam
  validate(createBidSchema, 'body'),
  nlpFilter, // Check for academic fraud in bid message
  asyncHandler(bidController.placeBid)
);

// GET /api/v1/bids/task/:id - Client views all bids for a task
router.get(
  '/task/:id',
  requireAuth,
  asyncHandler(bidController.getTaskBids)
);

// POST /api/v1/bids/task/:id/accept/:bidId - Client accepts a bid
router.post(
  '/task/:id/accept/:bidId',
  requireAuth,
  asyncHandler(bidController.acceptBid)
);

// POST /api/v1/bids/:bidId/counter - Client sends counter-offer
router.post(
  '/:bidId/counter',
  requireAuth,
  validate(counterOfferSchema, 'body'),
  asyncHandler(bidController.createCounterOffer)
);

// POST /api/v1/bids/:bidId/counter/accept - Freelancer accepts counter-offer
router.post(
  '/:bidId/counter/accept',
  requireAuth,
  asyncHandler(bidController.acceptCounterOffer)
);

module.exports = router;
