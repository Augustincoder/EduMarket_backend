const { z } = require('zod');

// Schema for placing a bid
const createBidSchema = z.object({
  message: z.string()
    .min(10, 'Taklif xabari kamida 10 ta belgidan iborat bo\'lishi kerak')
    .max(1000, 'Taklif xabari 1000 ta belgidan oshmasligi kerak'),
  proposedPrice: z.number().int().min(1000, 'Minimal narx 1000 so\'m'),
});

// Phase 14: Counter-offer schema
const counterOfferSchema = z.object({
  counterPrice: z.number().int().min(1000, 'Minimal narx 1000 so\'m'),
  counterMessage: z.string().max(500, 'Xabar juda uzun').optional()
});

module.exports = {
  createBidSchema,
  counterOfferSchema
};
