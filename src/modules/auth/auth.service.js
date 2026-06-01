const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { validateInitData } = require('../../utils/telegramAuth');
const { generateToken } = require('../../utils/jwt');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Handle Telegram Mini App login
 * Verifies initData and creates/updates the user.
 * 
 * @param {string} initData - Raw Telegram initData string
 * @param {string} ipAddress - Client IP address
 * @param {string} [referralCode] - Optional referral code (Phase 14)
 * @returns {object} Object containing the user and JWT token
 */
async function loginWithTelegram(initData, ipAddress, referralCode = null) {
  // 1. Validate initData
  const telegramUser = validateInitData(initData);
  
  if (!telegramUser) {
    throw new AppError('Telegram ma\'lumotlari yaroqsiz yoki muddati o\'tgan', 401, 'INVALID_INIT_DATA');
  }
  
  // 2. Extract necessary fields
  const tgId = BigInt(telegramUser.id);
  const username = telegramUser.username || null;
  const fullname = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
  // Optional: avatar handling can be done here or in a separate profile sync job
  
  // 3. Determine if admin
  const role = env.ADMIN_TELEGRAM_IDS.includes(Number(telegramUser.id)) ? 'ADMIN' : 'USER';
  
  // 4. Check referral if provided
  let referredById = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });
    // O'z-o'ziga taklif qilishni oldini olamiz
    if (referrer && referrer.telegramId !== tgId) {
      referredById = referrer.id;
    }
  }

  // 5. Generate a unique referral code for the user
  const ownReferralCode = require('crypto').randomBytes(4).toString('hex');

  // 6. Find or Create user (Replaced upsert with find/create to avoid Postgres 22P03 binary format error)
  let user = await prisma.user.findUnique({
    where: { telegramId: tgId }
  });

  const isNewUser = !user;

  if (user) {
    user = await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        username,
        fullname,
        role, // Update role in case they were added to admins in .env
        lastIpAddress: ipAddress,
      }
    });
  } else {
    user = await prisma.user.create({
      data: {
        telegramId: tgId,
        username,
        fullname,
        role,
        lastIpAddress: ipAddress,
        referredBy: referredById,
        referralCode: ownReferralCode
      }
    });
  }
  
  // 5. Check if user is banned
  if (user.isBanned) {
    throw new AppError(`Hisobingiz bloklangan. Sabab: ${user.banReason || 'Ko\'rsatilmagan'}`, 403, 'USER_BANNED');
  }
  
  // 6. Generate JWT
  const token = generateToken({
    userId: user.id,
    role: user.role
  });
  
  // Convert BigInt to string for JSON serialization
  const safeUser = {
    ...user,
    telegramId: user.telegramId.toString(),
    isOnboardingComplete: user.isOnboardingComplete,
    isFreelancer: user.isFreelancer,
  };
  
  return { user: safeUser, token, isNewUser };
}

module.exports = { loginWithTelegram };
