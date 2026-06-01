const { z } = require('zod');

const updateProfileSchema = z.object({
  fullname: z.string().min(3, 'To\'liq ism kamida 3 ta belgidan iborat bo\'lishi kerak').max(100).optional(),
  bio: z.string().max(1000, 'Tarjimai hol (bio) maksimal 1000 ta belgi bo\'lishi kerak').nullable().optional(),
  skills: z.array(z.string()).optional(),
  
  freelancerBio: z.string().max(1000, 'Mutaxassis tavsifi maksimal 1000 ta belgi bo\'lishi kerak').nullable().optional(),
  freelancerExperience: z.preprocess(
    (val) => (val === null || val === undefined || val === '') ? null : Number(val),
    z.number().min(0, "Tajriba manfiy bo'lishi mumkin emas").max(50, "Maksimal tajriba 50 yil").nullable().optional()
  ),
  freelancerCategories: z.array(z.string()).max(3, 'Maksimum 3 ta kategoriya tanlash mumkin').optional(),
}).strict();

module.exports = { updateProfileSchema };
