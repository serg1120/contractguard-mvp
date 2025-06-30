import express from 'express';
import cors from 'cors';
import path from 'path';
import { config, configManager } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { RateLimiter } from './middleware/rateLimiter';
import { requestLogger, simpleRequestLogger } from './middleware/requestLogger';
import { ResponseFormatter } from './utils/responseFormatter';
import { appLogger } from './utils/logger';
import { initializeSentry, getSentryMiddleware } from './utils/sentry';
import authRoutes from './routes/auth';
import contractRoutes from './routes/contracts';
import healthRoutes from './routes/health';
import { connectDatabase } from './utils/database';

const app = express();

// Initialize Sentry for error tracking
initializeSentry(app);
const sentryMiddleware = getSentryMiddleware();

// Sentry middleware (must be first)
if (sentryMiddleware.requestHandler && typeof sentryMiddleware.requestHandler === 'function') {
  app.use(sentryMiddleware.requestHandler);
}
if (sentryMiddleware.tracingHandler && typeof sentryMiddleware.tracingHandler === 'function') {
  app.use(sentryMiddleware.tracingHandler);
}

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
if (config.logging.enableRequestLogging) {
  if (configManager.isDevelopment()) {
    app.use(requestLogger);
  } else {
    app.use(simpleRequestLogger);
  }
}

// Apply general rate limiting to all routes
app.use('/api', RateLimiter.general);

// Static files for uploads
app.use('/uploads', express.static(path.resolve(config.fileUpload.uploadPath)));

// Health and monitoring routes (before rate limiting)
app.use('/', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Sentry error handler (must be before other error handlers)
if (sentryMiddleware.errorHandler && typeof sentryMiddleware.errorHandler === 'function') {
  app.use(sentryMiddleware.errorHandler);
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    appLogger.info('Starting ContractGuard API server...');
    
    // Connect to database
    await connectDatabase();
    appLogger.info('Database connected successfully');
    
    app.listen(config.port, () => {
      appLogger.info('ContractGuard API server started', {
        port: config.port,
        environment: config.nodeEnv,
        apiUrl: `http://localhost:${config.port}/api`,
        healthCheck: `http://localhost:${config.port}/health`,
      });
    });
  } catch (error) {
    appLogger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();