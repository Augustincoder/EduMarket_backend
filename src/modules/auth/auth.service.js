const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { validateInitData } = require('../../utils/telegramAuth');
const { generateToken, generateAdminToken } = require('../../utils/jwt');
const { AppError } = require('../../middleware/errorHandler');
const bcrypt = require('bcryptjs');

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

  // 6. Find or Create user (Replaced upsert with find/create to avoid Postgres 22P03 binary format error)
  let user = await prisma.user.findUnique({
    where: { telegramId: tgId }
  });

  const isNewUser = !user;

  if (user) {
    // 5. Check if user is banned
    if (user.isBanned) {
      throw new AppError(`Hisobingiz bloklangan. Sabab: ${user.banReason || 'Ko\'rsatilmagan'}`, 403, 'USER_BANNED');
    }

    // Calculate Streak & XP
    const now = new Date();
    let newStreak = user.streakCount || 0;
    let newXp = user.xp || 0;
    
    if (user.lastLoginDate) {
      const lastLogin = new Date(user.lastLoginDate);
      // Reset hours to compare pure dates
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      
      const diffTime = Math.abs(nowDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1; // Yesterday
        newXp += 50; // Daily reward
      } else if (diffDays > 1) {
        newStreak = 1; // Streak broken
        newXp += 50; 
      }
    } else {
      newStreak = 1;
      newXp += 50;
    }

    user = await prisma.user.update({
      where: { telegramId: tgId },
      data: {
        username,
        fullname,
        role, // Update role in case they were added to admins in .env
        referralCode: user.referralCode || require('crypto').randomBytes(4).toString('hex'),
        lastIpAddress: ipAddress,
        lastLoginDate: now,
        streakCount: newStreak,
        xp: newXp
      }
    });
  } else {
    const ownReferralCode = require('crypto').randomBytes(4).toString('hex');
    user = await prisma.user.create({
      data: {
        telegramId: tgId,
        username,
        fullname,
        role,
        lastIpAddress: ipAddress,
        referredBy: referredById,
        referralCode: ownReferralCode,
        lastLoginDate: new Date(),
        streakCount: 1,
        xp: 50
      }
    });
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

/**
 * Login admin using username and password
 */
async function loginAsAdmin(username, password) {
  const validUsername = env.ADMIN_USERNAME;
  const validPasswordHash = env.ADMIN_PASSWORD_HASH;
  
  if (!validUsername || !validPasswordHash) {
    throw new AppError('Admin tizimi sozlanmagan', 500, 'CONFIG_ERROR');
  }
  
  if (username !== validUsername) {
    await bcrypt.compare('dummy', validPasswordHash);
    throw new AppError('Noto\'g\'ri login yoki parol', 401, 'INVALID_CREDENTIALS');
  }
  
  const isValid = await bcrypt.compare(password, validPasswordHash);
  if (!isValid) {
    throw new AppError('Noto\'g\'ri login yoki parol', 401, 'INVALID_CREDENTIALS');
  }

  let user = await prisma.user.findFirst({
    where: { username: validUsername, role: 'ADMIN' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(0),
        username: validUsername,
        fullname: 'System Admin',
        role: 'ADMIN',
        isOnboardingComplete: true
      }
    });
  }

  const token = generateAdminToken({
    userId: user.id,
    role: user.role
  });

  return {
    user: {
      ...user,
      telegramId: user.telegramId.toString()
    },
    token
  };
}

module.exports = { loginWithTelegram, loginAsAdmin };
