// ============================================================================
// User Service
// ============================================================================
// Handles user-related business logic:
//   - Fetching all users (for starting new chats)
//   - Getting a user by ID
//   - Searching users by username
//
// Results always EXCLUDE the current user (you don't chat with yourself)
// and never return passwords.
// ============================================================================

import { prisma } from '../config/db';

// Fields to select from the User table (NEVER include password)
const SAFE_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  createdAt: true,
} as const;

export class UserService {
  /**
   * Returns all registered users except the currently authenticated user.
   * Used to display a list of people you can start a chat with.
   */
  static async getAllUsers(currentUserId: string) {
    return prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: SAFE_USER_SELECT,
      orderBy: { username: 'asc' },
    });
  }

  /**
   * Returns a single user by their ID.
   * Returns null if the user doesn't exist.
   */
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
  }

  /**
   * Searches for users whose username contains the query string.
   * Case-insensitive search using Prisma's `mode: 'insensitive'`.
   * Excludes the current user from results.
   */
  static async searchUsers(query: string, currentUserId: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: SAFE_USER_SELECT,
      orderBy: { username: 'asc' },
    });
  }

  /**
   * Updates the current user's profile (avatar, bio, username).
   * Only allows updating safe fields — never password or email through this method.
   */
  static async updateProfile(
    userId: string,
    data: { username?: string; avatar?: string; bio?: string },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: SAFE_USER_SELECT,
    });
  }
}
