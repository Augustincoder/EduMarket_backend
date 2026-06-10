const prisma = require('../config/prisma');

// Har bir test faylidan oldin
beforeAll(async () => {
  await prisma.$connect();
});

// Har bir test faylidan keyin
afterAll(async () => {
  await prisma.$disconnect();
});

// Har bir testdan keyin test DB'ni tozalash (test env uchun)
afterEach(async () => {
  if (process.env.NODE_ENV !== 'test') return;
  // Test DB tozalash logikasi (kerak bo'lsa)
});

// Jest ESM parser xatolarini oldini olish uchun jsdom va dompurify'ni mock qilamiz
jest.mock('jsdom', () => ({
  JSDOM: class {
    constructor() {
      this.window = {};
    }
  }
}));

jest.mock('dompurify', () => () => ({
  sanitize: (html) => html
}));
