// ============================================================================
// Authentication Middleware
// ============================================================================
// Protects routes by verifying the JWT token in the Authorization header.
//
// How it works:
//   1. Extract token from "Authorization: Bearer <token>" header
//   2. Verify token using the JWT secret
//   3. Attach decoded user data to req.user
//   4. Call next() to proceed to the route handler
//
// If the token is missing or invalid, the request is rejected with 401.
// ============================================================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, UserPayload } from '../types';

/**
 * Middleware that checks for a valid JWT token.
 * Use this on any route that requires authentication.
 *
 * Usage: router.get('/protected', authenticate, handler);
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  // Extract token from "Bearer <token>" format
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;

    // Attach user data to the request object
    // Now all subsequent handlers can access req.user
    req.user = decoded;

    next(); // Continue to the route handler
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
