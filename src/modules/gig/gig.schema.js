const { z } = require('zod');

const createGigSchema = z.object({
  title: z.string().min(5, 'Sarlavha kamida 5 ta belgidan iborat bo\'lishi kerak').max(100, 'Sarlavha maksimal 100 ta belgi bo\'lishi kerak'),
  description: z.string().min(10, 'Tavsif kamida 10 ta belgidan iborat bo\'lishi kerak').max(1000, 'Tavsif maksimal 1000 ta belgi bo\'lishi kerak'),
  price: z.number().int().min(1000, 'Narx kamida 1000 so\'m bo\'lishi kerak'),
  deliveryDays: z.number().int().min(1, 'Yetkazib berish muddati kamida 1 kun bo\'lishi kerak').max(30, 'Yetkazib berish muddati ko\'pi bilan 30 kun bo\'lishi kerak')
}).strict();

module.exports = { createGigSchema };
