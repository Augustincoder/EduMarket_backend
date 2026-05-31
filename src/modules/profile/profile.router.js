const router = require('express').Router();
const profileController = require('./profile.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { updateProfileSchema } = require('./profile.schema');

// Require authentication for all profile routes
router.use(requireAuth);

// GET /api/v1/users/leaderboard (Must be before /:userId)
router.get('/leaderboard', asyncHandler(profileController.getLeaderboard));

// GET /api/v1/users/me
router.get('/me', requireAuth, asyncHandler(profileController.getMyProfile));

// PUT /api/v1/users/me
router.put('/me', validate(updateProfileSchema, 'body'), asyncHandler(profileController.updateMyProfile));

// GET /api/v1/users/:userId
router.get('/:userId', asyncHandler(profileController.getUserProfile));

module.exports = router;
