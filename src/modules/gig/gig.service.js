const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const notificationService = require('../notification/notification.service');
const { TASK_STATUS } = require('../task/task.stateMachine');

/**
 * Create a new Gig (Service in Catalog)
 * Only experienced or VIP users can create gigs
 */
async function createGig(userId, data) {
  const { title, description, price, deliveryDays } = data;

  // Quality check: User must be VIP or have completed at least 3 tasks
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVip: true, _count: { select: { freelancerTasks: { where: { status: TASK_STATUS.COMPLETED } } } } }
  });

  if (!user) throw new AppError('Foydalanuvchi topilmadi', 404);

  if (!user.isVip && user._count.freelancerTasks < 3) {
    throw new AppError('Katalogga xizmat qo\'shish uchun kamida 3 ta vazifani muvaffaqiyatli yakunlagan bo\'lishingiz yoki VIP sotib olishingiz kerak.', 403);
  }

  return prisma.gig.create({
    data: {
      freelancerId: userId,
      title,
      description,
      price,
      deliveryDays
    }
  });
}

/**
 * List all active Gigs
 */
async function listGigs(query = {}) {
  const { limit = 10, page = 1, freelancerId, query: searchQuery } = query;
  const skip = (page - 1) * limit;

  const where = { isActive: true };
  if (freelancerId) {
    where.freelancerId = freelancerId;
  }
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  const [gigs, total] = await Promise.all([
    prisma.gig.findMany({
      where,
      include: {
        freelancer: {
          select: { id: true, fullname: true, avatarUrl: true, isVip: true, ratingSum: true, ratingCount: true }
        }
      },
      orderBy: [
        { freelancer: { isVip: 'desc' } }, // VIP gigs first
        { createdAt: 'desc' }
      ],
      skip,
      take: parseInt(limit, 10)
    }),
    prisma.gig.count({ where })
  ]);

  return {
    gigs,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Client orders a Gig
 * This automatically creates a Task directly in ASSIGNED state
 */
async function orderGig(gigId, clientId) {
  const gig = await prisma.gig.findUnique({
    where: { id: gigId }
  });

  if (!gig || !gig.isActive) {
    throw new AppError('Ushbu xizmat hozirda faol emas', 400);
  }

  if (gig.freelancerId === clientId) {
    throw new AppError('O\'zingizning xizmatingizni o\'zingiz sotib ola olmaysiz', 400);
  }

  // Calculate deadline based on deliveryDays
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + gig.deliveryDays);

  return prisma.$transaction(async (tx) => {
    // 1. Create a Task automatically assigned to the freelancer
    const task = await tx.task.create({
      data: {
        clientId,
        freelancerId: gig.freelancerId,
        category: 'BOSHQA', // Generic category for gigs
        title: `GIG ORDER: ${gig.title}`,
        description: `Mijoz quyidagi xizmatni katalogdan sotib oldi:\n\n${gig.description}`,
        priceMin: gig.price,
        priceMax: gig.price,
        agreedPrice: gig.price,
        deadline,
        status: TASK_STATUS.ASSIGNED,
        assignedAt: new Date()
      }
    });

    // 2. Notify the freelancer that someone bought their gig
    notificationService.notifyTaskAssigned(gig.freelancerId, task.title, task.id)
      .catch(err => console.error('Notify gig order error:', err));

    return task;
  });
}

/**
 * Toggle Gig active status
 */
async function toggleGigStatus(gigId, userId) {
  const gig = await prisma.gig.findUnique({ where: { id: gigId } });
  
  if (!gig) throw new AppError('Xizmat topilmadi', 404);
  if (gig.freelancerId !== userId) throw new AppError('Ruxsat yo\'q', 403);

  return prisma.gig.update({
    where: { id: gigId },
    data: { isActive: !gig.isActive }
  });
}

module.exports = {
  createGig,
  listGigs,
  orderGig,
  toggleGigStatus
};
