const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');

module.exports = function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', env.FRONTEND_URL],
      credentials: true,
    },
  });

  // Token-gated namespace via handshake.auth.token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('missing token'));
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('socket connected', { user: socket.user?.id });
    if (socket.user?.role) socket.join(`role:${socket.user.role}`);
    socket.on('disconnect', () => logger.debug('socket disconnected', { user: socket.user?.id }));
  });

  return io;
};
