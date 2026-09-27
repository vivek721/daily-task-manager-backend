/* eslint-disable no-process-exit -- process entry point: exiting on startup failure,
   uncaught exceptions and SIGTERM/SIGINT is intended here. */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { initDatabase } from './config/database';
import taskRoutes from './routes/taskRoutes';
import subagentRoutes from './routes/subagentRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import passport from './config/passport';
import { getMissingSecrets } from './config/env';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport is only used for the Google OAuth handshake, which is stateless
// (session: false on the routes; the callback issues a JWT). API requests authenticate
// with a Bearer JWT, so there is no session cookie to protect against CSRF.
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Daily Task Manager API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subagents', subagentRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  const missingSecrets = getMissingSecrets();
  if (missingSecrets.length > 0) {
    const message = `Missing or placeholder secrets: ${missingSecrets.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
      console.error(`${message}. Refusing to start in production.`);
      process.exit(1);
    }
    console.warn(`${message}. Authentication will not work until they are set.`);
  }

  try {
    // Initialize database
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📝 API docs: http://localhost:${PORT}/api/tasks`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

void startServer();
