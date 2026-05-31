const router = require('express').Router();
const portfolioController = require('./portfolio.controller');
const { requireAuth } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const { validate } = require('../../middleware/validate');
const { addPortfolioItemSchema } = require('./portfolio.schema');

// POST /api/v1/portfolio
router.post(
  '/',
  requireAuth,
  validate(addPortfolioItemSchema, 'body'),
  asyncHandler(portfolioController.addPortfolioItem)
);

// DELETE /api/v1/portfolio/:id
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(portfolioController.deletePortfolioItem)
);

// GET /api/v1/portfolio/user/:userId
router.get(
  '/user/:userId',
  asyncHandler(portfolioController.getUserPortfolio)
);

module.exports = router;
