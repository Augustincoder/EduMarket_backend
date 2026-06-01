const analyticsService = require('./analytics.service');

/**
 * Get current user's personal analytics/stats
 */
async function getMyStats(req, res) {
  const stats = await analyticsService.getPersonalStats(req.user.userId, req.query.role);
  res.json({ success: true, data: stats });
}

module.exports = {
  getMyStats
};
