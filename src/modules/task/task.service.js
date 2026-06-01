const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { TASK_STATUS, validateTransition } = require('./task.stateMachine');
const { getIO } = require('../../config/socket');
const notificationService = require('../notification/notification.service');

/**
 * Creates a new task
 */
async function createTask(clientId, data) {
  // Phase 14: Calculate rush fee if urgent (e.g. 20% premium logic could go here)
  const rushFee = data.isUrgent ? Math.floor(data.priceMin * 0.2) : 0;
  
  const task = await prisma.task.create({
    data: {
      clientId,
      category: data.category,
      title: data.title,
      description: data.description,
      priceMin: data.priceMin,
      priceMax: data.priceMax,
      deadline: new Date(data.deadline),
      attachmentFileIds: data.attachmentFileIds || [],
      status: TASK_STATUS.OPEN,
      isUrgent: data.isUrgent,
      rushFee
    }
  });

  // Phase 14: Smart Matching logic (EduMarket V2)
  // Find VIP freelancers who have this category in their skills
  const matchedVips = await prisma.user.findMany({
    where: {
      isVip: true,
      skills: {
        has: data.category
      }
    },
    select: { id: true, telegramId: true },
    take: 100 // Prevent memory overload if thousands match
  });

  // Send notifications asynchronously in chunks to prevent blocking/rate limits
  Promise.resolve().then(async () => {
    try {
      const chunkSize = 25;
      for (let i = 0; i < matchedVips.length; i += chunkSize) {
        const chunk = matchedVips.slice(i, i + chunkSize);
        await Promise.allSettled(
          chunk.map(freelancer => notificationService.smartMatchNotify(freelancer, task))
        );
      }
    } catch (err) {
      console.error('Smart match notification error:', err);
    }
  });

  return task;
}

/**
 * Get task by ID
 */
async function getTaskById(id) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          fullname: true,
          avatarUrl: true,
          ratingSum: true,
          ratingCount: true,
          isVip: true,
          badge: true
        }
      },
      freelancer: {
        select: {
          id: true,
          fullname: true,
          avatarUrl: true,
          ratingSum: true,
          ratingCount: true,
          isVip: true,
          badge: true
        }
      },
      // Include accepted bid if any
      bids: {
        where: { isAccepted: true },
        select: { id: true, proposedPrice: true, message: true }
      },
      dispute: {
        select: {
          id: true,
          reason: true,
          status: true,
          adminNotes: true
        }
      }
    }
  });

  if (!task || task.deletedAt) {
    throw new AppError('Vazifa topilmadi', 404, 'TASK_NOT_FOUND');
  }

  return task;
}

/**
 * Get user's tasks by role (Client/Freelancer)
 */
async function getMyTasks(userId, filters) {
  const { role, status } = filters;

  const where = {};
  if (role === 'CLIENT') {
    where.clientId = userId;
  } else if (role === 'FREELANCER') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isFreelancer: true } });
    if (!user || !user.isFreelancer) {
      throw new AppError('Siz freelancer emassiz. Avval freelancer rejimini faollashtiring.', 403);
    }
    where.freelancerId = userId;
  } else {
    // Both
    where.OR = [{ clientId: userId }, { freelancerId: userId }];
  }

  if (status) {
    if (status === 'OPEN') {
      where.status = 'OPEN';
    } else {
      where.status = status;
    }
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { id: true, fullname: true, avatarUrl: true } },
      freelancer: { select: { id: true, fullname: true, avatarUrl: true } },
      _count: { select: { bids: true, chat: { where: { isRead: false, senderId: { not: userId } } } } }
    }
  });

  return tasks;
}

/**
 * List tasks using cursor-based pagination (Phase 13 improvement)
 */
async function listTasks(filters) {
  const { cursor, limit, category, status, query, minPrice, maxPrice } = filters;

  // Build where clause
  const where = {
    deletedAt: null, // Soft delete filter
  };

  if (category) where.category = category;
  if (status) where.status = status;
  if (minPrice || maxPrice) {
    where.priceMin = {};
    if (minPrice) where.priceMin.gte = minPrice;
    if (maxPrice) where.priceMax = { lte: maxPrice };
  }
  
  // Phase 14: Full-text search using Postgres tsvector
  if (query) {
    const formattedQuery = query.trim().split(/\s+/).join(' | ');
    where.OR = [
      { title: { search: formattedQuery } },
      { description: { search: formattedQuery } }
    ];
  }

  // Cursor logic
  if (cursor) {
    where.id = { lt: cursor }; // 'lt' because we order by 'desc'
  }

  // Fetch limit + 1 to correctly determine if there's a next page
  const tasks = await prisma.task.findMany({
    where,
    take: limit + 1,
    orderBy: { id: 'desc' },
    include: {
      client: {
        select: { id: true, fullname: true, isVip: true, badge: true }
      },
      _count: {
        select: { bids: true }
      }
    }
  });

  let nextCursor = null;
  if (tasks.length > limit) {
    tasks.pop(); // Remove the extra item
    nextCursor = tasks[tasks.length - 1].id;
  }

  return {
    tasks,
    nextCursor
  };
}

/**
 * Internal helper to update state with validation
 */
async function _changeTaskState(taskId, nextState, expectedUserId, roleStr) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError('Vazifa topilmadi', 404);

  // Authorize
  if (roleStr === 'CLIENT' && task.clientId !== expectedUserId) throw new AppError('Siz mijoz emassiz', 403);
  if (roleStr === 'FREELANCER' && task.freelancerId !== expectedUserId) throw new AppError('Siz ijrochi emassiz', 403);
  if (roleStr === 'ANY_PARTICIPANT' && task.clientId !== expectedUserId && task.freelancerId !== expectedUserId) {
    throw new AppError('Ruxsat yo\'q', 403);
  }

  validateTransition(task.status, nextState);

  const updateData = { status: nextState };
  const now = new Date();
  
  switch (nextState) {
    case TASK_STATUS.IN_PROGRESS: updateData.inProgressAt = now; break;
    case TASK_STATUS.IN_REVIEW: updateData.inReviewAt = now; break;
    case TASK_STATUS.COMPLETED: updateData.completedAt = now; break;
    case TASK_STATUS.CANCELED: updateData.canceledAt = now; break;
  }

  const updatedTask = await prisma.task.update({ where: { id: taskId }, data: updateData, include: { client: true, freelancer: true } });

  try {
    const io = getIO();
    io.to(`task_${taskId}`).emit('task_status_changed', { taskId, newStatus: nextState });
  } catch (err) {
    // socket not init
  }

  return { 
    updatedTask, 
    oldTask: task 
  };
}

async function startProgress(taskId, freelancerId) {
  const { updatedTask } = await _changeTaskState(taskId, TASK_STATUS.IN_PROGRESS, freelancerId, 'FREELANCER');
  return updatedTask;
}

async function submitForReview(taskId, freelancerId) {
  const { updatedTask } = await _changeTaskState(taskId, TASK_STATUS.IN_REVIEW, freelancerId, 'FREELANCER');
  return updatedTask;
}

async function acceptDelivery(taskId, clientId) {
  const { updatedTask } = await _changeTaskState(taskId, TASK_STATUS.COMPLETED, clientId, 'CLIENT');
  await notificationService.taskCompleted(updatedTask);
  return updatedTask;
}

async function requestRevision(taskId, clientId, note) {
  const { updatedTask } = await _changeTaskState(taskId, TASK_STATUS.IN_PROGRESS, clientId, 'CLIENT');
  await notificationService.revisionRequested(updatedTask, note);
  return updatedTask;
}

async function cancelTask(taskId, userId) {
  const { updatedTask } = await _changeTaskState(taskId, TASK_STATUS.CANCELED, userId, 'ANY_PARTICIPANT');
  return updatedTask;
}

async function openDispute(taskId, userId, reason) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { client: true, freelancer: true } });
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== userId && task.freelancerId !== userId) throw new AppError('Ruxsat yo\'q', 403);

  validateTransition(task.status, TASK_STATUS.DISPUTED);

  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: {
        taskId,
        openedByUserId: userId,
        reason,
        status: 'OPEN'
      }
    });

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: { status: TASK_STATUS.DISPUTED },
      include: { client: true, freelancer: true }
    });

    await notificationService.disputeOpened(updatedTask, dispute);
    return { updatedTask, dispute };
  });
}

/**
 * Soft delete task (Client only)
 */
async function deleteTask(taskId, clientId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  
  if (!task) throw new AppError('Vazifa topilmadi', 404);
  if (task.clientId !== clientId) throw new AppError('Ruxsat yo\'q', 403);
  
  // Can only delete if OPEN or CANCELED
  if (task.status !== TASK_STATUS.OPEN && task.status !== TASK_STATUS.CANCELED) {
    throw new AppError('Bajarilayotgan vazifani o\'chirib bo\'lmaydi', 400);
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() }
  });
}

module.exports = {
  createTask,
  getTaskById,
  getMyTasks,
  listTasks,
  startProgress,
  submitForReview,
  acceptDelivery,
  requestRevision,
  cancelTask,
  openDispute,
  deleteTask
};
