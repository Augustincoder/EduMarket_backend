const prisma = require('../../config/prisma');

class BidRepository {
  async findById(id, include = {}) {
    return prisma.bid.findUnique({
      where: { id },
      include
    });
  }

  async findByTaskAndFreelancer(taskId, freelancerId) {
    return prisma.bid.findUnique({
      where: {
        taskId_freelancerId: { taskId, freelancerId }
      }
    });
  }

  async findByTask(taskId, include = {}) {
    return prisma.bid.findMany({
      where: { taskId },
      include
    });
  }

  async upsert(taskId, freelancerId, data) {
    return prisma.bid.upsert({
      where: {
        taskId_freelancerId: { taskId, freelancerId }
      },
      update: {
        message: data.message,
        proposedPrice: data.proposedPrice,
      },
      create: {
        taskId,
        freelancerId,
        message: data.message,
        proposedPrice: data.proposedPrice,
      }
    });
  }

  async update(id, data) {
    return prisma.bid.update({
      where: { id },
      data
    });
  }

  async acceptBidTransaction(taskId, bidId, freelancerId, agreedPrice) {
    return prisma.$transaction(async (tx) => {
      // 1. Update task state
      const updateResult = await tx.task.updateMany({
        where: { 
          id: taskId,
          status: 'OPEN'
        },
        data: {
          status: 'ASSIGNED',
          freelancerId,
          agreedPrice,
          assignedAt: new Date()
        }
      });

      if (updateResult.count === 0) {
        throw new Error('Vazifa allaqachon tayinlangan yoki yopilgan');
      }

      // 2. Mark bid as accepted
      await tx.bid.update({
        where: { id: bidId },
        data: { isAccepted: true }
      });

      // 3. Return updated task
      return tx.task.findUnique({ where: { id: taskId } });
    });
  }

  async acceptCounterOfferTransaction(taskId, bidId, freelancerId, agreedPrice) {
    return prisma.$transaction(async (tx) => {
      const updateResult = await tx.task.updateMany({
        where: { id: taskId, status: 'OPEN' },
        data: {
          status: 'ASSIGNED',
          freelancerId,
          agreedPrice,
          assignedAt: new Date()
        }
      });
      if (updateResult.count === 0) {
        throw new Error('Vazifa allaqachon tayinlangan yoki yopilgan');
      }

      await tx.bid.update({
        where: { id: bidId },
        data: { counterAccepted: true }
      });

      return tx.task.findUnique({ where: { id: taskId } });
    });
  }

  async delete(id) {
    return prisma.bid.delete({
      where: { id }
    });
  }
}

module.exports = new BidRepository();
