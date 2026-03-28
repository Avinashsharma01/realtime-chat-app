// ============================================================================
// Express Application Setup
// ============================================================================
// Creates and configures the Express application with:
//   - Security middleware (Helmet, CORS)
//   - Body parsing (JSON, URL-encoded)
//   - Request logging (Morgan)
//   - API routes
//   - Error handling
//
// This file ONLY sets up Express. The HTTP server creation and Socket.IO
// initialization happen in server.ts (separation of concerns).
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
// Helmet sets various HTTP headers to protect against common attacks
app.use(helmet());

// CORS allows the frontend (different origin) to call our API
app.use(
  cors({
    origin: env.CLIENT_URL, // Only allow requests from our frontend
    credentials: true,       // Allow cookies/auth headers
  }),
);

// ── Body Parsing ────────────────────────────────────────────────────────────
// Parse incoming JSON request bodies with a 10kb size limit to prevent
// abuse via oversized payloads (default Express limit is 100kb)
app.use(express.json({ limit: '10kb' }));
// Parse URL-encoded bodies (form submissions) with size limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Parse cookies
app.use(cookieParser());

// ── Logging ─────────────────────────────────────────────────────────────────
// Log HTTP requests in development for debugging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── API Routes ──────────────────────────────────────────────────────────────
// Each route group handles a specific domain:
//   /api/auth     → Register, Login, Get current user
//   /api/users    → List and search users
//   /api/chats    → Create and list chats
//   /api/messages → Send and fetch messages
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// ── Health Check ────────────────────────────────────────────────────────────
// Simple endpoint to verify the server is running
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handler ───────────────────────────────────────────────────────────
// Must be LAST middleware — catches errors from all routes
app.use(errorHandler);

export default app;
