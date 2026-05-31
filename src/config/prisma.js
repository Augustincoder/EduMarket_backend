// src/config/prisma.js
// PrismaClient singleton.
// Why singleton? In development, nodemon reloads the module on every file
// change. Without singleton, each reload creates a new DB connection pool,
// eventually exhausting PostgreSQL's max_connections (default: 100).

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'minimal',
  });

// In development: attach to global to survive hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
