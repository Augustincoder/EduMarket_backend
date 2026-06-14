const gigService = require('./gig.service');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Create a new Gig
 */
async function createGig(req, res) {
  const userId = req.user.id;
  const { title, description, price, deliveryDays } = req.body;

  if (!title || !description || !price || !deliveryDays) {
    throw new AppError('Barcha maydonlarni to\'ldiring', 400);
  }

  const gig = await gigService.createGig(userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Xizmat katalogga qo\'shildi',
    data: gig
  });
}

/**
 * List all active Gigs
 */
async function listGigs(req, res) {
  const result = await gigService.listGigs(req.query);

  res.json({
    success: true,
    data: result
  });
}

/**
 * Order a Gig
 */
async function orderGig(req, res) {
  const gigId = req.params.id;
  const clientId = req.user.id;

  const task = await gigService.orderGig(gigId, clientId);

  res.status(201).json({
    success: true,
    message: 'Xizmat sotib olindi. Ijrochiga xabar yuborildi.',
    data: task
  });
}

/**
 * Toggle active status
 */
async function toggleStatus(req, res) {
  const gigId = req.params.id;
  const userId = req.user.id;

  const gig = await gigService.toggleGigStatus(gigId, userId);

  res.json({
    success: true,
    message: gig.isActive ? 'Xizmat faollashdi' : 'Xizmat to\'xtatildi',
    data: gig
  });
}

module.exports = {
  createGig,
  listGigs,
  orderGig,
  toggleStatus
};
