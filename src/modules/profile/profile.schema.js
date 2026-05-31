const { z } = require('zod');

const updateProfileSchema = z.object({
  fullname: z.string().min(3, 'To\'liq ism kamida 3 ta belgidan iborat bo\'lishi kerak').max(100).optional(),
  bio: z.string().max(1000, 'Tarjimai hol (bio) maksimal 1000 ta belgi bo\'lishi kerak').nullable().optional(),
  skills: z.array(z.string()).optional()
}).strict();

module.exports = { updateProfileSchema };
