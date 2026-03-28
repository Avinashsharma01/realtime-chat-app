// ============================================================================
// Chat Service (Frontend)
// ============================================================================
// Handles API calls related to chats (1-on-1 AND group):
//   - Get all chats for the current user
//   - Create a new 1-on-1 chat / group chat
//   - Group management: rename, add/remove members, leave, promote admin
// ============================================================================

import api from './api';
import type { Chat } from '../types';

export const chatService = {
  // ── General ─────────────────────────────────────────────────────────────

  async getChats(): Promise<Chat[]> {
    const { data } = await api.get<{ chats: Chat[] }>('/chats');
    return data.chats;
  },

  async getChatById(chatId: string): Promise<Chat> {
    const { data } = await api.get<{ chat: Chat }>(`/chats/${chatId}`);
    return data.chat;
  },

  // ── 1-on-1 ──────────────────────────────────────────────────────────────

  async createChat(participantId: string): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>('/chats', {
      participantId,
    });
    return data.chat;
  },

  // ── Group ───────────────────────────────────────────────────────────────

  async createGroup(name: string, participantIds: string[]): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>('/chats/group', {
      name,
      participantIds,
    });
    return data.chat;
  },

  async renameGroup(chatId: string, name: string): Promise<Chat> {
    const { data } = await api.put<{ chat: Chat }>(`/chats/${chatId}/rename`, {
      name,
    });
    return data.chat;
  },

  async addMember(chatId: string, userId: string): Promise<Chat> {
    const { data } = await api.post<{ chat: Chat }>(
      `/chats/${chatId}/members`,
      { userId },
    );
    return data.chat;
  },

  async removeMember(chatId: string, userId: string): Promise<{ chat: Chat | null; message: string }> {
    const { data } = await api.delete<{ chat: Chat | null; message: string }>(
      `/chats/${chatId}/members/${userId}`,
    );
    return data;
  },

  async leaveGroup(chatId: string): Promise<{ chat: Chat | null; message: string }> {
    const { data } = await api.post<{ chat: Chat | null; message: string }>(
      `/chats/${chatId}/leave`,
    );
    return data;
  },

  async makeAdmin(chatId: string, userId: string): Promise<Chat> {
    const { data } = await api.put<{ chat: Chat }>(
      `/chats/${chatId}/members/${userId}/admin`,
    );
    return data.chat;
  },
};
