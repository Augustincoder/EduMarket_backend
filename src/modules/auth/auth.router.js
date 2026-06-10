const router = require('express').Router();
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { loginSchema } = require('./auth.schema');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { authRateLimiter, adminLoginRateLimiter } = require('../../middleware/rateLimiter');

// POST /api/v1/auth/login
// Apply authRateLimiter to prevent brute-forcing login
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema, 'body'),
  asyncHandler(authController.login)
);

// POST /api/v1/auth/admin-login
router.post(
  '/admin-login',
  adminLoginRateLimiter,
  asyncHandler(authController.adminLogin)
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  requireAuth,
  asyncHandler(authController.logout)
);

// GET /api/v1/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(authController.me)
);

module.exports = router;
