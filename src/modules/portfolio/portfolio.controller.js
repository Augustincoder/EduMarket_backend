const portfolioService = require('./portfolio.service');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Add a new portfolio item
 */
async function addPortfolioItem(req, res) {
  // Expected body: { title: "My best presentation", fileId: "telegram_file_id_string" }
  const { title, fileId } = req.body;
  const userId = req.user.userId;

  if (!title || !fileId) {
    throw new AppError('Sarlavha va fayl (fileId) kiritilishi shart', 400);
  }

  const item = await portfolioService.addPortfolioItem(userId, { title, fileId });

  res.status(201).json({
    success: true,
    message: 'Portfolio muvaffaqiyatli saqlandi',
    data: item
  });
}

/**
 * Delete a portfolio item
 */
async function deletePortfolioItem(req, res) {
  const itemId = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  await portfolioService.deletePortfolioItem(itemId, userId);

  res.json({
    success: true,
    message: 'Portfolio o\'chirildi'
  });
}

/**
 * Get user's portfolio
 */
async function getUserPortfolio(req, res) {
  const targetUserId = parseInt(req.params.userId, 10);

  const items = await portfolioService.getUserPortfolio(targetUserId);

  res.json({
    success: true,
    data: items
  });
}

module.exports = {
  addPortfolioItem,
  deletePortfolioItem,
  getUserPortfolio
};
