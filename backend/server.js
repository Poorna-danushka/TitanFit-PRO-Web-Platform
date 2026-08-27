import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { initializeEmailService } from './utils/email.js';

// Import middleware
import { corsMiddleware } from './middleware/cors.js';
import { csrfMiddleware } from './middleware/csrf.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import membershipRoutes from './routes/membershipRoutes.js';
import trainerRoutes from './routes/trainerRoutes.js';
import personalTrainingRoutes from './routes/personalTrainingRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

const app = express();

// ============ Security & Cookie Middleware ============
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(corsMiddleware);
app.use(cookieParser());
app.use(compression());

// ============ Body Parser Middleware ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// ============ CSRF & Rate Limiting ============
app.use('/api/', apiLimiter);
app.use('/api/', csrfMiddleware);

// ============ Logging Middleware ============
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ============ Health Check ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'TitanFit Pro API running', 
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV 
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============ API Routes ============
const defaultApiPrefix = process.env.API_PREFIX || '/api/v1';
const prefixes = Array.from(new Set([defaultApiPrefix, '/api/v1', '/api']));

prefixes.forEach((prefix) => {
  app.use(`${prefix}/auth`, authLimiter, authRoutes);
  app.use(`${prefix}/packages`, packageRoutes);
  app.use(`${prefix}/purchases`, purchaseRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/members`, memberRoutes);
  app.use(`${prefix}/memberships`, membershipRoutes);
  app.use(`${prefix}/trainers`, trainerRoutes);
  app.use(`${prefix}/personal-training`, personalTrainingRoutes);
  app.use(`${prefix}/attendance`, attendanceRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/chat`, chatRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/admin`, backupRoutes);
});

// ============ Error Handling ============
app.use(notFoundHandler);
app.use(errorHandler);

// ============ Server Start ============
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('✅ MongoDB connected');

    // Initialize email service
    try {
      initializeEmailService();
      logger.info('✅ Email service initialized');
    } catch (error) {
      logger.warn('⚠️ Email service not fully configured. Email features may not work.');
    }

    // Start listening
    app.listen(PORT, async () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📚 API Documentation:`);

      // Start backup scheduler if enabled
      try {
        const { startBackupScheduler } = await import('./services/backupScheduler.js');
        const schedulerEnabled = (process.env.BACKUP_SCHEDULER_ENABLED || 'true').toLowerCase() !== 'false';
        if (schedulerEnabled) {
          startBackupScheduler({ runOnStart: (process.env.BACKUP_SCHEDULER_RUN_ON_START || 'false') === 'true' });
        } else {
          logger.info('Backup scheduler disabled via BACKUP_SCHEDULER_ENABLED=false');
        }
      } catch (err) {
        logger.warn('Backup scheduler not started: ' + err.message);
      }

      // Start Plan Expiration Email & Notification Scheduler
      try {
        const { startPlanExpirationScheduler } = await import('./services/planExpirationScheduler.js');
        startPlanExpirationScheduler({ runOnStart: (process.env.EXPIRATION_SCHEDULER_RUN_ON_START || 'true') === 'true' });
      } catch (err) {
        logger.warn('Plan expiration scheduler not started: ' + err.message);
      }
      logger.info(`  - Auth: POST ${defaultApiPrefix}/auth/register, /auth/login, GET /auth/me`);
      logger.info(`  - Payments: POST ${defaultApiPrefix}/payments/intent, /payments/subscribe`);
      logger.info(`  - Packages: GET/POST ${defaultApiPrefix}/packages`);
      logger.info(`  - Memberships: GET ${defaultApiPrefix}/memberships/plans`);
      logger.info(`  - Trainers: GET ${defaultApiPrefix}/trainers`);
      logger.info(`  - AI Assistant: POST ${defaultApiPrefix}/ai/chat`);
      logger.info(`  - Admin: GET ${defaultApiPrefix}/admin/dashboard`);
      logger.info(`  - Health: GET /api/health`);
    });
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// ============ Graceful Shutdown ============
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

export default app;
