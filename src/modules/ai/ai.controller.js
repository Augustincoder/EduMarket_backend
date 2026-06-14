const aiService = require('./ai.service');

async function getLearningCompass(req, res) {
  const userId = req.user.id;
  const compassData = await aiService.generateLearningCompass(userId);
  
  res.json({
    success: true,
    data: compassData
  });
}

async function parseTask(req, res) {
  const { text } = req.body;
  if (!text || text.length < 10) {
    return res.status(400).json({ success: false, message: 'Matn juda qisqa' });
  }

  const result = await aiService.parseTaskBrief(text);
  res.json({ success: true, data: result });
}

module.exports = {
  getLearningCompass,
  parseTask
};
