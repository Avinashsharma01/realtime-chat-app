// ============================================================================
// TypeScript Type Definitions
// ============================================================================
// Central location for all shared types and interfaces.
// Every module imports types from here to maintain consistency.
// Using interfaces ensures strong typing across the entire backend.
// ============================================================================

import { Request } from 'express';

// ── User Types ──────────────────────────────────────────────────────────────

/** Data stored in the JWT token payload */
export interface UserPayload {
  id: string;
  username: string;
  email: string;
}

/** Input for user registration */
export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

/** Input for user login */
export interface LoginInput {
  email: string;
  password: string;
}

/** Safe user data (without password) */
export interface SafeUser {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  createdAt?: Date;
}

// ── Chat Types ──────────────────────────────────────────────────────────────

/** Input for creating a new 1-on-1 chat */
export interface CreateChatInput {
  participantId: string;
}

/** Input for creating a group chat */
export interface CreateGroupInput {
  name: string;
  participantIds: string[];   // Array of user IDs to add to the group
}

/** Input for adding a member to a group */
export interface AddMemberInput {
  userId: string;
}

/** Input for updating a group (e.g., rename) */
export interface UpdateGroupInput {
  name?: string;
}

/** Input for sending a message */
export interface SendMessageInput {
  chatId: string;
  content: string;
}

// ── Socket Types ────────────────────────────────────────────────────────────

/** Data sent when a message is sent via socket */
export interface SocketMessageData {
  chatId: string;
  content: string;
  recipientId?: string;       // For 1-on-1 chats
  isGroup?: boolean;          // True for group chat messages
}

/** Typing indicator data */
export interface TypingData {
  chatId: string;
  recipientId?: string;       // For 1-on-1 chats
  isGroup?: boolean;          // True for group typing
}

// ── Express Extension ───────────────────────────────────────────────────────

/** Express Request extended with authenticated user data */
export interface AuthRequest extends Request {
  user?: UserPayload;
}

// ── API Response Types ──────────────────────────────────────────────────────

/** Standard success response */
export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
