const router = require('express').Router();
const gigController = require('./gig.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { createGigSchema } = require('./gig.schema');

// GET /api/v1/gigs (Public or Authenticated, we make it Authenticated for now)
router.get(
  '/',
  requireAuth,
  asyncHandler(gigController.listGigs)
);

// POST /api/v1/gigs
router.post(
  '/',
  requireAuth,
  validate(createGigSchema, 'body'),
  asyncHandler(gigController.createGig)
);

// POST /api/v1/gigs/:id/order
router.post(
  '/:id/order',
  requireAuth,
  asyncHandler(gigController.orderGig)
);

// PATCH /api/v1/gigs/:id/toggle
router.patch(
  '/:id/toggle',
  requireAuth,
  asyncHandler(gigController.toggleStatus)
);

module.exports = router;
