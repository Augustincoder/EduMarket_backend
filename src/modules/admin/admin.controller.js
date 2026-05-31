const adminService = require('./admin.service');
const vipService = require('../vip/vip.service');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Get system stats
 */
async function getStats(req, res) {
  const stats = await adminService.getStats();
  res.json({ success: true, data: stats });
}

/**
 * Ban or unban a user
 */
async function setUserBan(req, res) {
  const targetUserId = parseInt(req.params.userId, 10);
  const { isBanned, reason } = req.body;
  
  if (isBanned && !reason) {
    throw new AppError('Bloklash sababini ko\'rsatish majburiy', 400);
  }

  const user = await adminService.setUserBanStatus(req.user.userId, targetUserId, isBanned, reason);
  
  res.json({
    success: true,
    message: isBanned ? 'Foydalanuvchi bloklandi' : 'Foydalanuvchi blokdan chiqarildi',
    data: { id: user.id, isBanned: user.isBanned }
  });
}

/**
 * Get pending VIP requests
 */
async function getPendingVipRequests(req, res) {
  const requests = await adminService.getPendingVipRequests();
  res.json({ success: true, data: requests });
}

/**
 * Process a VIP request
 */
async function processVipRequest(req, res) {
  const paymentId = parseInt(req.params.paymentId, 10);
  const { isApproved, rejectReason } = req.body;

  if (isApproved === false && !rejectReason) {
    throw new AppError('Rad etish sababini ko\'rsatish majburiy', 400);
  }

  const result = await vipService.processVipPayment(paymentId, req.user.userId, isApproved, rejectReason);

  res.json({
    success: true,
    message: isApproved ? 'VIP to\'lov tasdiqlandi' : 'VIP to\'lov rad etildi',
    data: result
  });
}

/**
 * Get unresolved fraud logs
 */
async function getFraudLogs(req, res) {
  const logs = await adminService.getFraudLogs();
  res.json({ success: true, data: logs });
}

/**
 * Mark fraud log as resolved
 */
async function resolveFraudLog(req, res) {
  const logId = parseInt(req.params.logId, 10);
  await adminService.resolveFraudLog(logId);
  res.json({ success: true, message: 'Log yopildi' });
}

/**
 * Get all open disputes
 */
async function getDisputes(req, res) {
  const disputes = await adminService.getOpenDisputes();
  res.json({ success: true, data: disputes });
}

/**
 * Resolve a dispute
 */
async function resolveDispute(req, res) {
  const disputeId = parseInt(req.params.id, 10);
  const { winner, adminNotes } = req.body;

  if (!winner) {
    throw new AppError('G\'olib ko\'rsatilishi majburiy', 400);
  }

  const result = await adminService.resolveDispute(disputeId, req.user.userId, { winner, adminNotes });
  
  res.json({
    success: true,
    message: 'Nizo hal qilindi',
    data: result
  });
}

module.exports = {
  getStats,
  setUserBan,
  getPendingVipRequests,
  processVipRequest,
  getFraudLogs,
  resolveFraudLog,
  getDisputes,
  resolveDispute
};
