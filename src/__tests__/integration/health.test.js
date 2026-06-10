const request = require('supertest');
jest.mock('../../config/redis', () => ({
  pubClient: { isOpen: false, setEx: jest.fn() },
  connectRedis: jest.fn()
}));
jest.mock('../../config/prisma', () => require('../mocks/prisma.mock'));

const createApp = require('../../app');
const app = createApp();

describe('GET /health', () => {
  it('tizim sog\'lomligini ko\'rsatishi kerak', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.ts).toBeDefined();
  });
});
