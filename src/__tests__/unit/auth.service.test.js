jest.mock('../../config/prisma', () => require('../mocks/prisma.mock'));
jest.mock('../../utils/telegramAuth', () => ({ validateInitData: jest.fn() }));
jest.mock('../../utils/jwt', () => ({ generateToken: jest.fn(), generateAdminToken: jest.fn() }));
jest.mock('../../config/env', () => ({ ADMIN_TELEGRAM_IDS: [999999999] }));

const { loginWithTelegram } = require('../../modules/auth/auth.service');
const { validateInitData } = require('../../utils/telegramAuth');
const { generateToken } = require('../../utils/jwt');
const mockPrisma = require('../mocks/prisma.mock');

describe('Auth Service - loginWithTelegram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('yangi foydalanuvchini yaratishi kerak', async () => {
    validateInitData.mockReturnValue({
      id: '123456789',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    });
    
    mockPrisma.user.findUnique.mockResolvedValue(null); // Yangi user
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-id-1',
      telegramId: BigInt('123456789'),
      fullname: 'Test User',
      role: 'USER',
      isOnboardingComplete: false,
      isFreelancer: false,
      streakCount: 1,
      xp: 50,
    });
    generateToken.mockReturnValue('mock-jwt-token');

    const result = await loginWithTelegram('valid-init-data', '127.0.0.1');

    expect(result.isNewUser).toBe(true);
    expect(result.token).toBe('mock-jwt-token');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        telegramId: BigInt('123456789'),
        username: 'testuser',
        fullname: 'Test User'
      })
    }));
  });

  it('mavjud foydalanuvchini yangilashi va streak/xp hisoblash kerak', async () => {
    validateInitData.mockReturnValue({
      id: '123456789',
      first_name: 'Test',
      username: 'testuser',
    });
    
    // Kechagi kunni mock qilish (Streak ko'payishi uchun)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-id-1',
      telegramId: BigInt('123456789'),
      fullname: 'Test User',
      role: 'USER',
      lastLoginDate: yesterday,
      streakCount: 5,
      xp: 200,
    });

    mockPrisma.user.update.mockResolvedValue({
      id: 'user-id-1',
      telegramId: BigInt('123456789'),
      fullname: 'Test User',
      role: 'USER',
      lastLoginDate: new Date(),
      streakCount: 6, // 5 + 1
      xp: 250, // 200 + 50
    });
    
    generateToken.mockReturnValue('mock-jwt-token');

    const result = await loginWithTelegram('valid-init-data', '127.0.0.1');

    expect(result.isNewUser).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        streakCount: 6,
        xp: 250
      })
    }));
  });

  it('bloklangan foydalanuvchini rad etishi kerak', async () => {
    validateInitData.mockReturnValue({ id: '123', first_name: 'Banned' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-id-2',
      telegramId: BigInt('123'),
      isBanned: true,
      banReason: 'Spam',
      fullname: 'Banned User',
    });

    await expect(loginWithTelegram('init-data', '127.0.0.1'))
      .rejects.toThrow('Hisobingiz bloklangan');
  });

  it('yaroqsiz initData ni rad etishi kerak', async () => {
    validateInitData.mockReturnValue(null);

    await expect(loginWithTelegram('invalid-data', '127.0.0.1'))
      .rejects.toThrow('Telegram ma\'lumotlari yaroqsiz');
  });
});
