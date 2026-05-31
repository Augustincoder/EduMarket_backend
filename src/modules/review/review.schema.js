const { z } = require('zod');

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string()
    .min(5, 'Izoh kamida 5 ta belgidan iborat bo\'lishi kerak')
    .max(500, 'Izoh 500 ta belgidan oshmasligi kerak')
});

module.exports = {
  createReviewSchema
};
