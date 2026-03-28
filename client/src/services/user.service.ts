// ============================================================================
// User Service
// ============================================================================
// API methods for user profile management.
// ============================================================================

import api from './api';
import type { User } from '../types';

interface UpdateProfileData {
  username?: string;
  avatar?: string;
  bio?: string;
}

export const userService = {
  /** Update the current user's profile */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put('/users/profile', data);
    return response.data.data;
  },
};
