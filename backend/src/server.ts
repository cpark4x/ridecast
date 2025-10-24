import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Import services
import authRoutes from './services/auth/routes';
import contentRoutes from './services/content/routes';
import audioRoutes from './services/audio/routes';
import userRoutes from './services/user/routes';
import compressionRoutes from './services/compression/routes';

// Import middleware
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler';
import logger from './shared/utils/logger';

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Ensure required directories exist
async function ensureDirectories() {
  const directories = ['/tmp/uploads', '/tmp/audio', 'logs'];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Directory ensured: ${dir}`);
    } catch (error) {
      logger.warn(`Failed to create directory: ${dir}`, { error });
    }
  }
}

// Configure middleware
function configureMiddleware() {
  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });
}

// Configure routes
function configureRoutes() {
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1/audio', audioRoutes);
  app.use('/api/v1/user', userRoutes);
  app.use('/api/v1/compression', compressionRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);
}

// Start server
async function startServer() {
  try {
    // Ensure directories exist
    await ensureDirectories();

    // Configure middleware and routes
    configureMiddleware();
    configureRoutes();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  process.exit(1);
});

// Start the server
startServer();

export default app;
