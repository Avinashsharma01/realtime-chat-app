// ============================================================================
// Authentication Service
// ============================================================================
// Handles the core authentication logic:
//   - Password hashing with bcrypt
//   - JWT token generation
//   - User registration (create account)
//   - User login (verify credentials)
//
// This is a SERVICE — it contains business logic but no HTTP-specific code.
// Controllers call these methods and handle the HTTP request/response.
// ============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { RegisterInput, LoginInput, UserPayload } from '../types';

// Number of salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Generates a JWT token containing the user's ID, username, and email.
   * This token is sent to the client and used for subsequent authenticated requests.
   *
   * @param user - The user data to encode in the token
   * @returns A signed JWT string
   */
  static generateToken(user: UserPayload): string {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      env.JWT_SECRET,
      // Cast needed: jwt types use StringValue from 'ms' package, not plain string
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );
  }

  /**
   * Registers a new user.
   *
   * Flow:
   *   1. Check if username or email already exists
   *   2. Hash the password with bcrypt
   *   3. Create the user in PostgreSQL
   *   4. Generate a JWT token
   *   5. Return user data + token
   *
   * @throws Error if user already exists
   */
  static async register(input: RegisterInput) {
    const { username, email, password } = input;

    // Check for existing user with same email or username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password — NEVER store plain text passwords
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      // Select only safe fields (exclude password)
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate JWT token for immediate login after registration
    const token = this.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return { user, token };
  }

  /**
   * Authenticates a user with email and password.
   *
   * Flow:
   *   1. Find user by email
   *   2. Compare provided password with stored hash
   *   3. Generate JWT token
   *   4. Return user data + token
   *
   * @throws Error if credentials are invalid
   */
  static async login(input: LoginInput) {
    const { email, password } = input;

    // Find user by email (include password for comparison)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Use generic message to prevent email enumeration
      throw new Error('Invalid credentials');
    }

    // Compare provided password with stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    // Return user data (without password) and token
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }
}
