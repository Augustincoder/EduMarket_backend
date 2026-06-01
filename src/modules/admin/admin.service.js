const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const notificationService = require('../notification/notification.service');
const { TASK_STATUS } = require('../task/task.stateMachine');

/**
 * Get system statistics
 */
async function getStats() {
  const [userCount, taskCount, completedTasks, pendingVip] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.vipPayment.count({ where: { isApproved: false, rejectedReason: null } })
  ]);

  return {
    users: userCount,
    tasks: {
      total: taskCount,
      completed: completedTasks
    },
    pendingVipRequests: pendingVip
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

    // 3. Optional: Transaction/Escrow refund logic here

    // 4. Send Notifications
    await notificationService.disputeResolved(updatedTask, updatedDispute, winner);

    return { updatedDispute, updatedTask };
  });
}

module.exports = {
  getStats,
  setUserBanStatus,
  getPendingVipRequests,
  getFraudLogs,
  resolveFraudLog,
  getOpenDisputes,
  resolveDispute
};
