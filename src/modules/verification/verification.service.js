const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Submit a verification request
 */
async function submitRequest(userId, data) {
  // Check if there's already a pending request
  const existingPending = await prisma.verificationRequest.findFirst({
    where: { userId, status: 'PENDING' }
  });

  if (existingPending) {
    throw new AppError('Sizda allaqachon ko\'rib chiqilayotgan so\'rov mavjud', 400);
  }

  const request = await prisma.verificationRequest.create({
    data: {
      userId,
      documentType: data.documentType,
      documentFileId: data.documentFileId,
      selfieFileId: data.selfieFileId,
      status: 'PENDING'
    }
  });

  // Update user status to PENDING
  await prisma.user.update({
    where: { id: userId },
    data: { verificationStatus: 'PENDING' }
  });

  return request;
}

/**
 * Get user's current verification request
 */
async function getMyRequest(userId) {
  return await prisma.verificationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Admin: Get all requests (paginated)
 */
async function getAllRequests(filters = {}, page = 1, limit = 20) {
  const where = {};
  if (filters.status) where.status = filters.status;

  const [total, requests] = await Promise.all([
    prisma.verificationRequest.count({ where }),
    prisma.verificationRequest.findMany({
      where,
      include: {
        user: { select: { id: true, fullname: true, avatarUrl: true, telegramId: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  return { requests, total, pages: Math.ceil(total / limit) };
}

/**
 * Admin: Resolve request (Approve/Reject)
 */
async function resolveRequest(requestId, adminId, data) {
  const request = await prisma.verificationRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) throw new AppError('So\'rov topilmadi', 404);
  if (request.status !== 'PENDING') throw new AppError('Ushbu so\'rov allaqachon yakunlangan', 400);

  const updatedRequest = await prisma.verificationRequest.update({
    where: { id: requestId },
    data: {
      status: data.status,
      adminNote: data.adminNote,
      resolvedAt: new Date(),
      resolvedBy: adminId
    }
  });

  // Update User profile
  await prisma.user.update({
    where: { id: request.userId },
    data: {
      verificationStatus: data.status,
      isVerifiedStudent: data.status === 'APPROVED' // Also set student verified if approved
    }
  });

  // TODO: Send Telegram notification to user about the result
  
  return updatedRequest;
}

module.exports = {
  submitRequest,
  getMyRequest,
  getAllRequests,
  resolveRequest
};
