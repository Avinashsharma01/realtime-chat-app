// ============================================================================
// User Controller
// ============================================================================
// Handles HTTP requests for user-related endpoints:
//   GET /api/users         — Get all users (for new chat)
//   GET /api/users/search  — Search users by username
//   GET /api/users/:id     — Get a single user by ID
//
// All routes require authentication (the authenticate middleware
// must run before these handlers).
// ============================================================================

import { Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AuthRequest } from '../types';

export class UserController {
  /**
   * GET /api/users
   * Returns all registered users except the current user.
   * Used on the frontend to show who you can start a chat with.
   */
  static async getAllUsers(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const users = await UserService.getAllUsers(req.user!.id);
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   * Returns a single user by their ID.
   * Returns 404 if the user doesn't exist.
   */
  static async getUserById(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/search?q=john
   * Searches for users whose username contains the query string.
   * Requires the `q` query parameter.
   */
  static async searchUsers(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({ message: 'Search query (q) is required' });
        return;
      }

      const users = await UserService.searchUsers(query, req.user!.id);
      res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/profile
   * Updates the current user's profile (username, avatar URL, bio).
   * Request body: { username?: string, avatar?: string, bio?: string }
   */
  static async updateProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { username, avatar, bio } = req.body;

      if (!username && avatar === undefined && bio === undefined) {
        res.status(400).json({ message: 'At least one field is required (username, avatar, bio)' });
        return;
      }

      const updateData: { username?: string; avatar?: string; bio?: string } = {};
      if (username?.trim()) updateData.username = username.trim();
      if (avatar !== undefined) updateData.avatar = avatar;
      if (bio !== undefined) updateData.bio = bio;

      const user = await UserService.updateProfile(req.user!.id, updateData);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}
