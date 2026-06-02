const router = require('express').Router();
const profileController = require('./profile.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { cache } = require('../../middleware/cache');
const { updateProfileSchema } = require('./profile.schema');

// Require authentication for all profile routes
router.use(requireAuth);

// GET /api/v1/users/leaderboard (Must be before /:userId)
router.get('/leaderboard', cache(300), asyncHandler(profileController.getLeaderboard));

// GET /api/v1/users/me
router.get('/me', requireAuth, asyncHandler(profileController.getMyProfile));

// GET /api/v1/users/me/referrals
router.get('/me/referrals', requireAuth, asyncHandler(profileController.getMyReferrals));

// PUT /api/v1/users/me
router.put('/me', validate(updateProfileSchema, 'body'), asyncHandler(profileController.updateMyProfile));

// GET /api/v1/users/:userId
router.get('/:userId', cache(120), asyncHandler(profileController.getUserProfile));

module.exports = router;
