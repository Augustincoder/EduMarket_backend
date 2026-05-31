const prisma = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const { VIP_PACKAGES } = require('./vip.packages');
const notificationService = require('../notification/notification.service');

/**
 * Submit a VIP purchase request
 */
async function createVipRequest(userId, data) {
  const { packageType, screenshotFileId, phoneNumber } = data;

  const pkg = VIP_PACKAGES[packageType];
  if (!pkg) {
    throw new AppError('Noma\'lum VIP paketi', 400);
  }

  // Check if user already has pending request
  const existingPending = await prisma.vipPayment.findFirst({
    where: {
      userId,
      isApproved: false,
      rejectedReason: null
    }
  });

  if (existingPending) {
    throw new AppError('Sizda allaqachon ko\'rib chiqilayotgan so\'rov mavjud', 400);
  }

  return prisma.vipPayment.create({
    data: {
      userId,
      amount: pkg.price,
      packageType,
      screenshotFileId,
      phoneNumber
    }
  });
}

/**
 * Get user's VIP status and payment history
 */
async function getVipStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVip: true, vipExpiresAt: true }
  });

  const history = await prisma.vipPayment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return {
    status: user,
    history
  };
}

/**
 * Process a VIP payment (Admin only)
 */
async function processVipPayment(paymentId, adminId, isApproved, rejectReason = null) {
  const payment = await prisma.vipPayment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) throw new AppError('To\'lov topilmadi', 404);
  if (payment.isApproved || payment.rejectedReason) {
    throw new AppError('Bu to\'lov allaqachon ko\'rib chiqilgan', 400);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update payment record
    const updatedPayment = await tx.vipPayment.update({
      where: { id: paymentId },
      data: {
        isApproved,
        approvedBy: adminId,
        approvedAt: isApproved ? new Date() : null,
        rejectedReason: !isApproved ? rejectReason : null
      }
    });

    // 2. If approved, grant VIP to user
    if (isApproved) {
      const pkg = VIP_PACKAGES[payment.packageType];
      
      const user = await tx.user.findUnique({ where: { id: payment.userId } });
      
      // Calculate new expiration date
      let newExpiresAt = new Date();
      if (user.isVip && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
        // Extend existing VIP
        newExpiresAt = new Date(user.vipExpiresAt);
      }
      
      newExpiresAt.setDate(newExpiresAt.getDate() + pkg.durationDays);

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          isVip: true,
          vipExpiresAt: newExpiresAt
        }
      });

      // EduMarket V2: Referral Bonus Logic
      if (user.referredBy) {
        const referrer = await tx.user.findUnique({ where: { id: user.referredBy } });
        if (referrer) {
          let refExpiresAt = new Date();
          if (referrer.isVip && referrer.vipExpiresAt && referrer.vipExpiresAt > new Date()) {
            refExpiresAt = new Date(referrer.vipExpiresAt);
          }
          refExpiresAt.setDate(refExpiresAt.getDate() + 10); // +10 days bonus

          await tx.user.update({
            where: { id: referrer.id },
            data: { isVip: true, vipExpiresAt: refExpiresAt }
          });

          // Notify referrer asynchronously
          notificationService.referralBonusNotify(referrer, 10)
            .catch(err => console.error('Referral notify error:', err));
        }
      }
    }

    // Phase 14: Notify user of approval/rejection via BullMQ here (Skipped for now)

    return updatedPayment;
  });
}

module.exports = {
  createVipRequest,
  getVipStatus,
  processVipPayment
};
