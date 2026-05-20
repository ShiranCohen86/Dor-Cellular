require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const initSockets = require('./src/sockets');
const { seedIfEmpty } = require('./seed/seed');

/**
 * Boots the API: connects to MongoDB, optionally auto-seeds an empty DB,
 * mounts Socket.io on the HTTP server, and starts listening.
 */
async function bootstrap() {
  await connectDB();

  if (env.AUTO_SEED_IF_EMPTY) {
    try {
      const wasSeeded = await seedIfEmpty();
      if (wasSeeded) logger.info('Auto-seed ran (DB was empty). Demo users created.');
    } catch (err) {
      logger.error('Auto-seed failed', { err: err.message });
    }
  }

  const httpServer = http.createServer(app);
  const io = initSockets(httpServer);
  app.set('io', io);

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Kill the existing process and restart.`);
    } else {
      logger.error('HTTP server error', { err: err.message });
    }
    process.exit(1);
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`Dor-Store API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', { err: err.message });
  });
  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { err: err.message });
  process.exit(1);
});
