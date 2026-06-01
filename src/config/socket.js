const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('./redis');
const { verifyToken } = require('../utils/jwt');
const { isBlacklisted } = require('../utils/tokenBlacklist');
const logger = require('../utils/logger');
const prisma = require('./prisma');

let io;

/**
 * Initialize Socket.io Server and attach to HTTP server
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow TMA frontend
      methods: ['GET', 'POST']
    }
  });

  // Attach Redis adapter for cluster/multi-instance scale if connected
  if (pubClient.isOpen && subClient.isOpen) {
    io.adapter(createAdapter(pubClient, subClient));
  } else {
    logger.warn('Redis is not connected. Socket.io will use memory adapter.');
  }

  // Middleware for Authentication
  io.use(async (socket, next) => {
    try {
      // 1. Get token from handshake auth or query
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // 2. Verify Token
      const decoded = verifyToken(token);

      // 3. Check Blacklist
      if (isBlacklisted(decoded.jti)) {
        return next(new Error('Authentication error: Session ended'));
      }

      // 4. Verify User
      const userIdStr = String(decoded.userId);
      const user = await prisma.user.findUnique({
        where: { id: userIdStr },
        select: { id: true, isBanned: true }
      });

      if (!user) return next(new Error('Authentication error: User not found'));
      if (user.isBanned) return next(new Error('Authentication error: User banned'));

      // Attach user object to socket for later use
      socket.user = { ...decoded, userId: userIdStr };
      next();
    } catch (err) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user.userId})`);

    // Client requests to join a task-specific chat room
    socket.on('join_task_room', async (taskId) => {
      // Validate that user belongs to this task
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { clientId: true, freelancerId: true }
      });

      if (!task) return;
      if (task.clientId !== socket.user.userId && task.freelancerId !== socket.user.userId) {
        // User not authorized to join this task's chat
        socket.emit('error', 'Bu vazifa chatiga kirish ruxsati yo\'q');
        return;
      }

      const roomName = `task_${taskId}`;
      socket.join(roomName);
      logger.debug(`User ${socket.user.userId} joined room ${roomName}`);
    });

    socket.on('leave_task_room', (taskId) => {
      const roomName = `task_${taskId}`;
      socket.leave(roomName);
      logger.debug(`User ${socket.user.userId} left room ${roomName}`);
    });

    socket.on('typing', ({ taskId }) => {
      if (!taskId) return;
      const roomName = `task_${taskId}`;
      // Broadcast to everyone in the room except the sender
      socket.to(roomName).emit('user_typing', { taskId, userId: socket.user.userId });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get initialized Socket.io instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO
};
