const aiService = require('./ai.service');

async function getLearningCompass(req, res) {
  const userId = req.user.userId || req.user.id;
  const compassData = await aiService.generateLearningCompass(userId);
  
  res.json({
    success: true,
    data: compassData
  });
}

module.exports = {
  getLearningCompass
};
