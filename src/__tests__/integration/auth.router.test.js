const request = require('supertest');
jest.mock('../../config/redis', () => ({
  pubClient: { isOpen: false, setEx: jest.fn() },
  connectRedis: jest.fn()
}));
jest.mock('../../config/prisma', () => require('../mocks/prisma.mock'));

const createApp = require('../../app');
const app = createApp();

describe('POST /api/v1/auth/login', () => {
  it('yaroqsiz initData uchun 401 qaytarishi kerak', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ initData: 'invalid-data' });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('initData bo\'lmasa 400 qaytarishi kerak', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
