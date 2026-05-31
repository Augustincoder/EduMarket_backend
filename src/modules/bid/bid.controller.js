const bidService = require('./bid.service');

/**
 * Freelancer places a bid on a task
 */
async function placeBid(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const freelancerId = req.user.userId;
  
  const bid = await bidService.createBid(taskId, freelancerId, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Taklif muvaffaqiyatli qabul qilindi',
    data: bid
  });
}

/**
 * Client accepts a freelancer's bid
 */
async function acceptBid(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const bidId = parseInt(req.params.bidId, 10);
  const clientId = req.user.userId;
  
  const task = await bidService.acceptBid(taskId, bidId, clientId);
  
  res.json({
    success: true,
    message: 'Taklif qabul qilindi. Vazifa "Bajarilmoqda" holatiga o\'tdi.',
    data: task
  });
}

/**
 * Client creates a counter-offer
 */
async function createCounterOffer(req, res) {
  const bidId = parseInt(req.params.bidId, 10);
  const clientId = req.user.userId;
  
  const bid = await bidService.createCounterOffer(bidId, clientId, req.body);
  
  res.json({
    success: true,
    message: 'Qarshi taklif yuborildi',
    data: bid
  });
}

/**
 * Freelancer accepts the counter-offer
 */
async function acceptCounterOffer(req, res) {
  const bidId = parseInt(req.params.bidId, 10);
  const freelancerId = req.user.userId;
  
  const bid = await bidService.acceptCounterOffer(bidId, freelancerId);
  
  res.json({
    success: true,
    message: 'Qarshi taklif qabul qilindi',
    data: bid
  });
}

/**
 * Client views all bids for a task
 */
async function getTaskBids(req, res) {
  const taskId = parseInt(req.params.id, 10);
  const clientId = req.user.userId;

  const bids = await bidService.getTaskBids(taskId, clientId);

  res.json({
    success: true,
    data: bids
  });
}

module.exports = {
  placeBid,
  acceptBid,
  createCounterOffer,
  acceptCounterOffer,
  getTaskBids
};
