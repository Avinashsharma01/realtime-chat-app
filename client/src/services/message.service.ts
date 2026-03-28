// ============================================================================
// Message Service (Frontend)
// ============================================================================
// Handles API calls related to messages:
//   - Get messages for a chat (with pagination)
//   - Send a message via REST API (fallback for Socket.IO)
//
// In normal operation, messages are sent via Socket.IO for real-time
// delivery. This REST API serves as a fallback.
// ============================================================================

import api from './api';
import type { Message, MessagesResponse } from '../types';

export const messageService = {
  /**
   * Fetches messages for a specific chat with pagination.
   * Messages are returned in chronological order (oldest first).
   */
  async getMessages(
    chatId: string,
    page: number = 1,
  ): Promise<MessagesResponse> {
    const { data } = await api.get<MessagesResponse>(
      `/messages/${chatId}?page=${page}`,
    );
    return data;
  },

  /**
   * Sends a message via REST API.
   * Normally messages go through Socket.IO for real-time delivery.
   */
  async sendMessage(chatId: string, content: string): Promise<Message> {
    const { data } = await api.post<{ message: Message }>(
      `/messages/${chatId}`,
      { content },
    );
    return data.message;
  },

  /**
   * Deletes a message (soft-delete — only the sender can delete).
   */
  async deleteMessage(messageId: string): Promise<Message> {
    const { data } = await api.delete<{ message: Message }>(
      `/messages/${messageId}`,
    );
    return data.message;
  },
};
