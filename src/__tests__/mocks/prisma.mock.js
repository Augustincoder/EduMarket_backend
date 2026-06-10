// Haqiqiy DB'ga ulanmaslik uchun Prisma mock
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  bid: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
  $disconnect: jest.fn(),
  $connect: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([1]),
};

module.exports = mockPrisma;
