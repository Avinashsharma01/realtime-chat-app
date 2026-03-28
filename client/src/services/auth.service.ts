// ============================================================================
// Authentication Service (Frontend)
// ============================================================================
// Handles API calls related to authentication:
//   - Login
//   - Register
//   - Get current user profile
//
// Uses the pre-configured Axios instance from api.ts.
// ============================================================================

import api from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  /**
   * Logs in a user with email and password.
   * Returns user data and JWT token.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  /**
   * Registers a new user account.
   * Returns user data and JWT token (auto-login after registration).
   */
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      username,
      email,
      password,
    });
    return data;
  },

  /**
   * Fetches the currently authenticated user's profile.
   * Uses the token stored in localStorage (added automatically by api.ts).
   */
  async getCurrentUser(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  },
};
