// ============================================================================
// Authentication Controller
// ============================================================================
// Handles HTTP requests for authentication endpoints:
//   POST /api/auth/register — Create a new account
//   POST /api/auth/login    — Log in with credentials
//   GET  /api/auth/me       — Get current user (requires auth)
//
// Controllers extract data from requests, call services for business logic,
// and send HTTP responses. They do NOT contain business logic themselves.
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types';

export class AuthController {
  /**
   * POST /api/auth/register
   * Creates a new user account.
   *
   * Request body: { username, email, password }
   * Response: { message, user, token }
   */
  static async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({ message: 'Username, email, and password are required' });
        return;
      }

      // Validate password length
      if (password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters' });
        return;
      }

      // Call the auth service to handle registration
      const result = await AuthService.register({ username, email, password });

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      // Handle "user already exists" error specifically
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ message: error.message });
        return;
      }
      next(error); // Pass other errors to the global error handler
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates a user with email and password.
   *
   * Request body: { email, password }
   * Response: { message, user, token }
   */
  static async login(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      // Call the auth service to verify credentials
      const result = await AuthService.login({ email, password });

      res.status(200).json({
        message: 'Login successful',
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      // Handle invalid credentials specifically
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user's data.
   * Requires the authenticate middleware to run first.
   *
   * Response: { user: { id, username, email } }
   */
  static async me(req: AuthRequest, res: Response): Promise<void> {
    // req.user is set by the authenticate middleware
    res.status(200).json({ user: req.user });
  }
}
