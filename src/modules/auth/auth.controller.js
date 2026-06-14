const authService = require('./auth.service');
const { blacklistToken } = require('../../utils/tokenBlacklist');

/**
 * Login user via Telegram initData
 */
async function login(req, res) {
  const { initData, referralCode } = req.body;
  const ipAddress = req.ip;

  const { user, token } = await authService.loginWithTelegram(initData, ipAddress, referralCode);

  // Set JWT as HttpOnly cookie (more secure against XSS)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Required for cross-origin TMA
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    message: 'Tizimga muvaffaqiyatli kirdingiz',
    data: {
      user,
      token // Also send token in body for mobile clients that don't support cookies well
    }
  });
}

/**
 * Logout user by blacklisting their token and clearing cookie
 */
async function logout(req, res) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  if (token && req.user && req.user.exp) {
    const tokenExp = req.user.exp - Math.floor(Date.now() / 1000);
    await blacklistToken(token, Math.max(tokenExp, 0));
  }

  // Clear cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none'
  });

  res.json({
    success: true,
    message: 'Tizimdan muvaffaqiyatli chiqdingiz'
  });
}

/**
 * Get current logged in user's session status
 */
async function me(req, res) {
  // req.user is populated by requireAuth middleware
  res.json({
    success: true,
    data: {
      userId: req.user.id,
      role: req.user.role
    }
  });
}

/**
 * Login admin via username and password
 */
async function adminLogin(req, res) {
  const { username, password } = req.body;

  const { user, token } = await authService.loginAsAdmin(username, password);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message: 'Admin panelga muvaffaqiyatli kirdingiz',
    data: {
      user,
      token
    }
  });
}

module.exports = {
  login,
  logout,
  me,
  adminLogin
};
