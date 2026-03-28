// ============================================================================
// Database Connections
// ============================================================================
// Sets up connections to BOTH databases:
//   1. PostgreSQL via Prisma — for relational data (users, chats, messages)
//   2. MongoDB via Mongoose  — for flexible metadata and search indexing
//
// WHY TWO DATABASES?
//   PostgreSQL excels at structured, relational data with strict integrity.
//   MongoDB excels at flexible documents, text search, and denormalized data.
//   Using both gives us the best of each world.
// ============================================================================

import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { env } from './env';

// ── PostgreSQL Connection (Prisma) ──────────────────────────────────────────
// PrismaClient is a singleton — create it once and reuse across the app.
// In development, log SQL queries for debugging.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// ── MongoDB Connection (Mongoose) ───────────────────────────────────────────
// Mongoose manages its own connection pool internally.
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1); // Exit if MongoDB is not available
  }
};

// ── Graceful Shutdown ───────────────────────────────────────────────────────
// Clean up database connections when the server shuts down.
export const disconnectDatabases = async (): Promise<void> => {
  await prisma.$disconnect();
  await mongoose.disconnect();
  console.log('🔌 Database connections closed');
};
