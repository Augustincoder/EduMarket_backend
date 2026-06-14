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
  const targetUserId = req.params.userId;
  const { isBanned, reason } = req.body;
  
  if (isBanned && !reason) {
    throw new AppError('Bloklash sababini ko\'rsatish majburiy', 400);
  }

  const user = await adminService.setUserBanStatus(req.user.id, targetUserId, isBanned, reason);
  
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
  const limit = parseInt(req.query.limit, 10) || 50;
  const cursor = req.query.cursor || null;
  const result = await adminService.getPendingVipRequests(limit, cursor);
  res.json({ success: true, data: result });
}

/**
 * Process a VIP request
 */
async function processVipRequest(req, res) {
  const paymentId = req.params.paymentId;
  const { isApproved, rejectReason } = req.body;

  if (isApproved === false && !rejectReason) {
    throw new AppError('Rad etish sababini ko\'rsatish majburiy', 400);
  }

  const result = await vipService.processVipPayment(paymentId, req.user.id, isApproved, rejectReason);

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
  const logId = req.params.logId;
  await adminService.resolveFraudLog(logId);
  res.json({ success: true, message: 'Log yopildi' });
}

/**
 * Get all open disputes
 */
async function getDisputes(req, res) {
  const limit = parseInt(req.query.limit, 10) || 50;
  const cursor = req.query.cursor || null;
  const result = await adminService.getOpenDisputes(limit, cursor);
  res.json({ success: true, data: result });
}

/**
 * Resolve a dispute
 */
async function resolveDispute(req, res) {
  const disputeId = req.params.id;
  const { winner, adminNotes } = req.body;

  if (!winner) {
    throw new AppError('G\'olib ko\'rsatilishi majburiy', 400);
  }

  const result = await adminService.resolveDispute(disputeId, req.user.id, { winner, adminNotes });
  
  res.json({
    success: true,
    message: 'Nizo hal qilindi',
    data: result
  });
}

/**
 * Get all users with filters and search
 */
async function getUsers(req, res) {
  const filters = {
    role: req.query.role,
    isVip: req.query.isVip,
    isBanned: req.query.isBanned,
    search: req.query.search
  };
  const users = await adminService.getUsers(filters);
  res.json({ success: true, data: users });
}

/**
 * Update user VIP status directly
 */
async function setUserVip(req, res) {
  const targetUserId = req.params.userId;
  const { isVip, durationDays } = req.body;

  const user = await adminService.setUserVipStatus(req.user.id, targetUserId, isVip, durationDays);
  res.json({ success: true, message: 'Foydalanuvchi VIP statusi o\'zgartirildi', data: user });
}

/**
 * Send warning message to user
 */
async function warnUser(req, res) {
  const targetUserId = req.params.userId;
  const { message } = req.body;

  if (!message) {
    throw new AppError('Ogohlantirish xabari bo\'sh bo\'lishi mumkin emas', 400);
  }

  await adminService.warnUser(req.user.id, targetUserId, message);
  res.json({ success: true, message: 'Ogohlantirish yuborildi' });
}

/**
 * Verify student request status
 */
async function verifyStudent(req, res) {
  const targetUserId = req.params.userId;
  const { isApproved, rejectReason } = req.body;

  if (!isApproved && !rejectReason) {
    throw new AppError('Rad etish sababini ko\'rsatish majburiy', 400);
  }

  const user = await adminService.verifyStudentStatus(req.user.id, targetUserId, isApproved, rejectReason);
  res.json({ success: true, message: isApproved ? 'Talaba arizasi tasdiqlandi' : 'Talaba arizasi rad etildi', data: user });
}

/**
 * Get chat messages for dispute
 */
async function getDisputeChat(req, res) {
  const disputeId = req.params.id;
  const chat = await adminService.getDisputeChat(disputeId);
  res.json({ success: true, data: chat });
}

/**
 * Get all transaction history
 */
async function getTransactions(req, res) {
  const transactions = await adminService.getTransactions();
  res.json({ success: true, data: transactions });
}

/**
 * Get system settings
 */
async function getSettings(req, res) {
  const settings = await adminService.getSettings();
  res.json({ success: true, data: settings });
}

/**
 * Update system setting
 */
async function updateSetting(req, res) {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    throw new AppError('Kalit va qiymat majburiy', 400);
  }

  const setting = await adminService.updateSetting(req.user.id, key, value);
  res.json({ success: true, message: 'Sozlama saqlandi', data: setting });
}

/**
 * Get audit logs
 */
async function getAuditLogs(req, res) {
  const logs = await adminService.getAuditLogs();
  res.json({ success: true, data: logs });
}

/**
 * Broadcast mass Telegram message
 */
async function broadcastMessage(req, res) {
  const { targetType, text } = req.body;

  if (!targetType || !text) {
    throw new AppError('Guruh va matn majburiy', 400);
  }

  const result = await adminService.broadcastMessage(req.user.id, targetType, text);
  res.json({ success: true, message: `Xabar yuborish boshlandi. Jami: ${result.sentCount} ta foydalanuvchi` });
}

/**
 * Delete task (moderator)
 */
async function deleteTask(req, res) {
  const taskId = req.params.taskId;
  await adminService.deleteTask(req.user.id, taskId);
  res.json({ success: true, message: 'Vazifa o\'chirildi/bekor qilindi' });
}

/**
 * Delete gig (moderator)
 */
async function deleteGig(req, res) {
  const gigId = req.params.gigId;
  await adminService.deleteGig(req.user.id, gigId);
  res.json({ success: true, message: 'Xizmat (gig) o\'chirildi' });
}

module.exports = {
  getStats,
  setUserBan,
  getPendingVipRequests,
  processVipRequest,
  getFraudLogs,
  resolveFraudLog,
  getDisputes,
  resolveDispute,
  getUsers,
  setUserVip,
  warnUser,
  verifyStudent,
  getDisputeChat,
  getTransactions,
  getSettings,
  updateSetting,
  getAuditLogs,
  broadcastMessage,
  deleteTask,
  deleteGig
};
