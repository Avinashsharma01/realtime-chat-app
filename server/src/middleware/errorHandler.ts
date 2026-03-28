// ============================================================================
// Global Error Handler Middleware
// ============================================================================
// Catches all errors thrown by route handlers and sends a consistent
// JSON error response. In development, includes the error stack trace.
//
// Express recognizes this as an error handler because it has 4 parameters
// (err, req, res, next) — this is how Express differentiates error
// middleware from regular middleware.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global error handler. Must be registered LAST with app.use().
 * Any error passed to next(error) in route handlers ends up here.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log the error for server-side debugging
  console.error('🔴 Error:', err.message);
  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Send a JSON error response
  res.status(500).json({
    message: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    // Only include stack trace in development (never expose in production)
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
