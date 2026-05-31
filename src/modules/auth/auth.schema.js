const { z } = require('zod');

const loginSchema = z.object({
  initData: z.string({
    required_error: 'Telegram initData majburiy',
  }).min(1, 'initData bo\'sh bo\'lishi mumkin emas'),
  
  // Phase 14: Referral system
  referralCode: z.string().optional(),
});

module.exports = { loginSchema };
