jest.mock('../../config/prisma', () => require('../mocks/prisma.mock'));
jest.mock('../../modules/notification/notification.service', () => ({
  notifyTaskAssigned: jest.fn(),
  notifyNewBid: jest.fn()
}));
// Prevent circular dependency issues or anti-fraud logic in unit tests
jest.mock('../../utils/antifraud', () => ({ detectSpamBids: jest.fn().mockResolvedValue(false) }));

const { acceptBid } = require('../../modules/bid/bid.service');
const mockPrisma = require('../mocks/prisma.mock');
const notificationService = require('../../modules/notification/notification.service');

describe('Bid Service — acceptBid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bid ni muvaffaqiyatli qabul qilishi va holatni ASSIGNED ga o\'zgartirishi kerak', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      clientId: 'client-1',
      status: 'OPEN',
    });

    mockPrisma.bid.findUnique.mockResolvedValue({
      id: 'bid-1',
      taskId: 'task-1',
      freelancerId: 'freelancer-1',
      proposedPrice: 50000,
      counterAccepted: false
    });
    
    mockPrisma.$transaction.mockImplementation(async (fn) => await fn(mockPrisma));
    mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.bid.update.mockResolvedValue({ id: 'bid-1', isAccepted: true });
    
    // findUnique ikki marta chaqiriladi: 1-si tekshirish uchun, 2-si qaytarish uchun
    mockPrisma.task.findUnique
      .mockResolvedValueOnce({ id: 'task-1', clientId: 'client-1', status: 'OPEN', title: 'Test' })
      .mockResolvedValueOnce({ id: 'task-1', status: 'ASSIGNED', title: 'Test' });

    const result = await acceptBid('task-1', 'bid-1', 'client-1');
    
    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1', status: 'OPEN' },
        data: expect.objectContaining({ status: 'ASSIGNED', freelancerId: 'freelancer-1', agreedPrice: 50000 })
      })
    );
    expect(mockPrisma.bid.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'bid-1' }, data: { isAccepted: true } })
    );
    expect(notificationService.notifyTaskAssigned).toHaveBeenCalledWith('freelancer-1', 'Test', 'task-1');
    expect(result.status).toBe('ASSIGNED');
  });

  it('boshqa client bid qabul qila olmasligi kerak', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => await fn(mockPrisma));
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      clientId: 'real-client',
      status: 'OPEN',
    });

    await expect(acceptBid('task-1', 'bid-1', 'fake-client'))
      .rejects.toThrow('Ruxsat yo\'q');
  });

  it('noto\'g\'ri statusda xato berishi kerak', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => await fn(mockPrisma));
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      clientId: 'client-1',
      status: 'COMPLETED', // Noto'g'ri status
    });

    await expect(acceptBid('task-1', 'bid-1', 'client-1'))
      .rejects.toThrow('Ruxsat etilmagan holat o\'zgarishi');
  });
});
