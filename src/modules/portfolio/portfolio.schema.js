const { z } = require('zod');

const addPortfolioItemSchema = z.object({
  title: z.string().min(5, 'Sarlavha kamida 5 ta belgidan iborat bo\'lishi kerak').max(100, 'Sarlavha maksimal 100 ta belgi bo\'lishi kerak'),
  fileId: z.string().min(1, 'Fayl tanlanishi majburiy')
}).strict();

module.exports = { addPortfolioItemSchema };
