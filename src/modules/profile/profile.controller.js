const profileService = require('./profile.service');

/**
 * Get current user profile
 */
async function getMyProfile(req, res) {
  const profile = await profileService.getProfile(req.user.userId);
  res.json({ success: true, data: profile });
}

/**
 * Update current user profile
 */
async function updateMyProfile(req, res) {
  const updatedProfile = await profileService.updateProfile(req.user.userId, req.body);
  res.json({
    success: true,
    message: 'Profil muvaffaqiyatli yangilandi',
    data: updatedProfile
  });
}

/**
 * Get another user's public profile
 */
async function getUserProfile(req, res) {
  const userId = req.params.userId;
  const profile = await profileService.getProfile(userId);
  
  res.json({ success: true, data: profile });
}

/**
 * Get monthly leaderboard
 */
async function getLeaderboard(req, res) {
  const leaderboard = await profileService.getLeaderboard();

  res.json({
    success: true,
    data: leaderboard
  });
}

/**
 * Get referrals
 */
async function getMyReferrals(req, res) {
  const referrals = await profileService.getReferrals(req.user.userId);
  res.json({
    success: true,
    data: referrals
  });
}

/**
 * Update user's push token for FCM
 */
async function updatePushToken(req, res) {
  const { token } = req.body;
  await profileService.updatePushToken(req.user.userId, token);
  res.json({ success: true, message: 'Push token yangilandi' });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getLeaderboard,
  getMyReferrals,
  updatePushToken
};
