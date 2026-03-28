// ============================================================================
// Frontend TypeScript Type Definitions
// ============================================================================
// Shared types for the entire React frontend.
// These mirror the backend data shapes to ensure type safety
// across the full stack.
// ============================================================================

import type { Socket } from 'socket.io-client';

// ── User Types ──────────────────────────────────────────────────────────────

/** User data returned from the API (never includes password) */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  createdAt?: string;
}

/** Shape of the AuthContext value */
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Chat Types ──────────────────────────────────────────────────────────────

/** A participant in a chat (junction between user and chat) */
export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role?: string;   // "admin" | "member" — relevant for group chats
  user: User;
}

/** A single chat message */
export interface Message {
  id: string;
  content: string;
  chatId: string;
  senderId: string;
  sender: User;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** MongoDB chat metadata (optional enrichment data) */
export interface ChatMetadataType {
  chatId: string;
  isGroup?: boolean;
  groupName?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: string;
  };
  metadata?: {
    totalMessages: number;
    createdBy: string;
  };
}

/** A chat conversation (1-on-1 or group) */
export interface Chat {
  id: string;
  isGroup: boolean;
  name: string | null;           // Group name (null for 1-on-1)
  createdById: string | null;    // Group creator
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages: Message[]; // Latest message(s) for preview
  metadata?: ChatMetadataType | null;
}

// ── API Response Types ──────────────────────────────────────────────────────

/** Response from /api/auth/login and /api/auth/register */
export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

/** Pagination info included in paginated responses */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response from GET /api/messages/:chatId */
export interface MessagesResponse {
  messages: Message[];
  pagination: PaginationInfo;
}

// ── Socket Types ────────────────────────────────────────────────────────────

/** Shape of the SocketContext value */
export interface SocketContextType {
  /** The Socket.IO client instance (or null when disconnected) */
  socket: Socket | null;
  onlineUsers: string[];
}
