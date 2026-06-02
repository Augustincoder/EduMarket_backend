const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const notificationService = require('../notification/notification.service');
const { TASK_STATUS } = require('../task/task.stateMachine');

/**
 * Log admin action to database
 */
async function logAction(adminId, action, details) {
  return prisma.adminLog.create({
    data: {
      adminId,
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : details
    }
  });
}

/**
 * Get system statistics
 */
async function getStats() {
  const [userCount, taskCount, completedTasks, pendingVip, pendingReports, openDisputes, pendingStudentVerifications] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.vipPayment.count({ where: { isApproved: false, rejectedReason: null } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.dispute.count({ where: { status: 'OPEN' } }),
    prisma.user.count({ where: { isVerifiedStudent: false, studentCardFileId: { not: null } } })
  ]);

  // Chart data: Last 7 days user growth and tasks created
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const startOfDay = new Date(d.setHours(0, 0, 0, 0));
    const endOfDay = new Date(d.setHours(23, 59, 59, 999));
    
    const [dailyUsers, dailyTasks] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } }),
      prisma.task.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay } } })
    ]);
    
    chartData.push({
      name: startOfDay.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
      users: dailyUsers,
      tasks: dailyTasks
    });
  }

  return {
    users: userCount,
    tasks: {
      total: taskCount,
      completed: completedTasks
    },
    pendingVipRequests: pendingVip,
    pendingReports,
    openDisputes,
    pendingStudentVerifications,
    chartData
  };
}

/**
 * Ban or unban a user
 */
async function setUserBanStatus(adminId, targetUserId, isBanned, reason) {
  if (adminId === targetUserId) {
    throw new AppError('O\'zingizni bloklay olmaysiz', 400);
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isBanned,
      banReason: isBanned ? reason : null
    }
  });

  await logAction(adminId, isBanned ? 'BAN_USER' : 'UNBAN_USER', { userId: targetUserId, reason });

  return user;
}

/**
 * Get all pending VIP requests
 */
async function getPendingVipRequests(limit = 50, cursor = null) {
  const where = {
    isApproved: false,
    rejectedReason: null
  };

  const requests = await prisma.vipPayment.findMany({
    where,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      user: {
        select: { id: true, fullname: true, username: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  let nextCursor = null;
  if (requests.length > limit) {
    requests.pop();
    nextCursor = requests[requests.length - 1].id;
  }

  return { requests, nextCursor };
}

/**
 * Get fraud logs
 */
async function getFraudLogs() {
  return prisma.fraudLog.findMany({
    where: { isActioned: false },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

/**
 * Mark fraud log as actioned
 */
async function resolveFraudLog(logId) {
  return prisma.fraudLog.update({
    where: { id: logId },
    data: { isActioned: true }
  });
}

/**
 * Get all open disputes
 */
async function getOpenDisputes(limit = 50, cursor = null) {
  const where = { status: 'OPEN' };

  const disputes = await prisma.dispute.findMany({
    where,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      task: {
        include: {
          client: { select: { id: true, fullname: true, username: true } },
          freelancer: { select: { id: true, fullname: true, username: true } }
        }
      },
      openedBy: { select: { id: true, fullname: true, username: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  let nextCursor = null;
  if (disputes.length > limit) {
    disputes.pop();
    nextCursor = disputes[disputes.length - 1].id;
  }

  return { disputes, nextCursor };
}

/**
 * Resolve a dispute
 */
async function resolveDispute(disputeId, adminUserId, resolutionData) {
  const { winner, adminNotes } = resolutionData; // winner: 'CLIENT' | 'FREELANCER'

  if (winner !== 'CLIENT' && winner !== 'FREELANCER') {
    throw new AppError('G\'olib CLIENT yoki FREELANCER bo\'lishi shart', 400);
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { task: true }
  });

  if (!dispute) throw new AppError('Nizo topilmadi', 404);
  if (dispute.status !== 'OPEN') throw new AppError('Bu nizo allaqachon yopilgan', 400);
  if (dispute.task.status !== TASK_STATUS.DISPUTED) throw new AppError('Vazifa nizo holatida emas', 400);

  return prisma.$transaction(async (tx) => {
    // 1. Resolve Dispute
    const updatedDispute = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: winner === 'CLIENT' ? 'RESOLVED_FOR_CLIENT' : 'RESOLVED_FOR_FREELANCER',
        adminNotes,
        resolvedAt: new Date()
      }
    });

    // 2. Update Task Status
    const nextTaskStatus = winner === 'CLIENT' ? TASK_STATUS.CANCELED : TASK_STATUS.COMPLETED;
    const updatedTask = await tx.task.update({
      where: { id: dispute.taskId },
      data: { status: nextTaskStatus }
    });

    // 3. Log Action
    await tx.adminLog.create({
      data: {
        adminId: adminUserId,
        action: 'RESOLVE_DISPUTE',
        details: JSON.stringify({ disputeId, winner, adminNotes })
      }
    });

    // 4. Send Notifications
    await notificationService.disputeResolved(updatedTask, updatedDispute, winner);

    return { updatedDispute, updatedTask };
  });
}

/**
 * Get all users with filters and search
 */
async function getUsers(filters = {}) {
  const { role, isVip, isBanned, search } = filters;
  const where = {};
  
  if (role) where.role = role;
  if (isVip !== undefined) where.isVip = isVip === 'true' || isVip === true;
  if (isBanned !== undefined) where.isBanned = isBanned === 'true' || isBanned === true;
  
  if (search) {
    where.OR = [
      { fullname: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } }
    ];
  }

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Change user VIP status directly
 */
async function setUserVipStatus(adminId, targetUserId, isVip, durationDays = 30) {
  let vipExpiresAt = null;
  if (isVip) {
    vipExpiresAt = new Date();
    vipExpiresAt.setDate(vipExpiresAt.getDate() + parseInt(durationDays, 10));
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: { isVip, vipExpiresAt }
  });

  await logAction(adminId, isVip ? 'GRANT_VIP' : 'REVOKE_VIP', { userId: targetUserId, durationDays });
  return user;
}

/**
 * Warn a user via Telegram notification
 */
async function warnUser(adminId, targetUserId, message) {
  await notificationService.notifyWarning(targetUserId, message);
  await logAction(adminId, 'WARN_USER', { userId: targetUserId, message });
  return { success: true };
}

/**
 * Verify student verification request
 */
async function verifyStudentStatus(adminId, targetUserId, isApproved, rejectReason = null) {
  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isVerifiedStudent: isApproved,
      badge: isApproved ? 'ISHONCHLI' : 'YANGI'
    }
  });

  await logAction(adminId, isApproved ? 'VERIFY_STUDENT_APPROVE' : 'VERIFY_STUDENT_REJECT', { userId: targetUserId, rejectReason });
  
  const text = isApproved 
    ? `🎓 <b>Tabriklaymiz!</b>\n\nTalaba guvohnomangiz tasdiqlandi. Sizga "Ishonchli" talaba belgisi berildi! ✅`
    : `🎓 <b>Talabalik arizangiz rad etildi.</b>\n\nSababi: ${rejectReason || 'Hujjatlar mos kelmadi'}`;
  
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { telegramId: true } });
  if (targetUser) {
    await notificationService.notifyBroadcast(targetUser.telegramId.toString(), text);
  }

  return user;
}

/**
 * Get chat messages for dispute
 */
async function getDisputeChat(disputeId) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { taskId: true }
  });
  if (!dispute) throw new AppError('Nizo topilmadi', 404);

  return prisma.chatMessage.findMany({
    where: { taskId: dispute.taskId },
    include: {
      sender: { select: { id: true, fullname: true, username: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get transaction history ledger
 */
async function getTransactions() {
  return prisma.transactionLog.findMany({
    include: {
      user: { select: { id: true, fullname: true, username: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Get dynamic system settings
 */
async function getSettings() {
  const list = await prisma.systemSetting.findMany();
  const settings = {};
  list.forEach(s => {
    settings[s.key] = s.value;
  });
  
  if (!settings.vip_price_7_days) settings.vip_price_7_days = '15000';
  if (!settings.vip_price_30_days) settings.vip_price_30_days = '45000';
  if (!settings.commission_percentage) settings.commission_percentage = '10';
  
  return settings;
}

/**
 * Update system settings
 */
async function updateSetting(adminId, key, value) {
  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });

  await logAction(adminId, 'UPDATE_SETTING', { key, value });
  return setting;
}

/**
 * Get admin audit logs
 */
async function getAuditLogs() {
  return prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Send bulk broadcast message
 */
async function broadcastMessage(adminId, targetType, text) {
  const where = { isBanned: false };
  if (targetType === 'FREELANCERS') where.isFreelancer = true;
  if (targetType === 'CLIENTS') where.isFreelancer = false;
  if (targetType === 'VIP') where.isVip = true;

  const users = await prisma.user.findMany({
    where,
    select: { telegramId: true }
  });

  (async () => {
    for (const u of users) {
      try {
        await notificationService.notifyBroadcast(u.telegramId.toString(), text);
        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        console.error(`Broadcast failed for user ${u.telegramId}:`, err.message);
      }
    }
  })();

  await logAction(adminId, 'BROADCAST_MESSAGE', { targetType, text: text.slice(0, 100) });
  return { sentCount: users.length };
}

/**
 * Delete a spam task
 */
async function deleteTask(adminId, taskId) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'CANCELED', deletedAt: new Date() }
  });

  await logAction(adminId, 'DELETE_TASK', { taskId });
  return task;
}

/**
 * Delete a spam gig
 */
async function deleteGig(adminId, gigId) {
  const gig = await prisma.gig.update({
    where: { id: gigId },
    data: { isActive: false }
  });

  await logAction(adminId, 'DELETE_GIG', { gigId });
  return gig;
}

module.exports = {
  logAction,
  getStats,
  setUserBanStatus,
  getPendingVipRequests,
  getFraudLogs,
  resolveFraudLog,
  getOpenDisputes,
  resolveDispute,
  getUsers,
  setUserVipStatus,
  warnUser,
  verifyStudentStatus,
  getDisputeChat,
  getTransactions,
  getSettings,
  updateSetting,
  getAuditLogs,
  broadcastMessage,
  deleteTask,
  deleteGig
};
