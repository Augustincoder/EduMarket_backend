const { z } = require('zod');

const buyVipSchema = z.object({
  packageType: z.enum(['7_DAY', '30_DAY'], {
    errorMap: () => ({ message: 'Paket turi faqat 7_DAY yoki 30_DAY bo\'lishi mumkin' })
  }),
  screenshotFileId: z.string().min(1, 'To\'lov screenshoti majburiy'),
  phoneNumber: z.string().regex(/^\+?998\d{9}$/, 'Telefon raqami +998XXXXXXXXX formatida bo\'lishi kerak').optional()
}).strict();

module.exports = { buyVipSchema };
