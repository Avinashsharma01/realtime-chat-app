// ============================================================================
// Environment Configuration
// ============================================================================
// Loads and validates environment variables from .env file.
// Centralizes all config so other files import from here instead of
// reading process.env directly. This makes it easy to see all required
// variables in one place and catch missing values early.
// ============================================================================

import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

/**
 * All environment variables used by the application.
 * If a required variable is missing, the app will use a fallback
 * (or fail when trying to connect to the database).
 */
export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // PostgreSQL connection string (used by Prisma)
  DATABASE_URL: process.env.DATABASE_URL || '',

  // MongoDB connection string (used by Mongoose)
  MONGODB_URI: process.env.MONGODB_URI || '',

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Frontend URL for CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
} as const;

// ── Startup Validation ──────────────────────────────────────────────────────
// Fail fast if critical environment variables are missing or insecure.
// This prevents the app from running with an unsafe default JWT secret
// or without a database connection string.
(function validateEnv() {
  const errors: string[] = [];

  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required (PostgreSQL connection string)');
  }
  if (!env.MONGODB_URI) {
    errors.push('MONGODB_URI is required (MongoDB connection string)');
  }
  if (
    env.NODE_ENV === 'production' &&
    env.JWT_SECRET === 'default-secret-change-me'
  ) {
    errors.push('JWT_SECRET must be set in production (do not use the default)');
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach((e) => console.error(`   • ${e}`));
    console.error('\nPlease check your .env file and try again.\n');
    process.exit(1);
  }
})();
