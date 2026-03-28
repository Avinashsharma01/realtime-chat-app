// ============================================================================
// Message Controller
// ============================================================================
// Handles HTTP requests for message-related endpoints:
//   GET  /api/messages/:chatId         — Get messages (paginated)
//   POST /api/messages/:chatId         — Send a message (REST fallback)
//   GET  /api/messages/:chatId/search  — Search messages in a chat
//
// Note: Messages are typically sent via Socket.IO for real-time delivery,
// but the REST endpoint exists as a fallback and for testing.
// ============================================================================

import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { AuthRequest } from '../types';
import { prisma } from '../config/db';

/**
 * Verifies that the authenticated user is a participant in the given chat.
 * Returns true if authorized, false otherwise (and sends 403 response).
 */
async function verifyMembership(
  req: AuthRequest,
  res: Response,
  chatId: string,
): Promise<boolean> {
  const participant = await prisma.chatParticipant.findUnique({
    where: { chatId_userId: { chatId, userId: req.user!.id } },
  });
  if (!participant) {
    res.status(403).json({ message: 'You are not a member of this chat' });
    return false;
  }
  return true;
}

export class MessageController {
  /**
   * GET /api/messages/:chatId?page=1&limit=50
   * Returns messages for a chat with pagination.
   *
   * Query params:
   *   page  — Page number (default: 1)
   *   limit — Messages per page (default: 50)
   */
  static async getChatMessages(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Authorization: verify user is a member of this chat
      if (!(await verifyMembership(req, res, chatId))) return;

      const result = await MessageService.getChatMessages(chatId, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/messages/:chatId
   * Sends a message in a chat via REST API.
   *
   * Request body: { content: string }
   *
   * Normally messages go through Socket.IO, but this endpoint
   * works as a fallback when WebSocket is unavailable.
   */
  static async sendMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ message: 'Message content is required' });
        return;
      }

      // Authorization: verify user is a member of this chat
      if (!(await verifyMembership(req, res, chatId))) return;

      const message = await MessageService.sendMessage(
        chatId,
        req.user!.id,
        content.trim(),
      );

      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/messages/:chatId/search?q=hello
   * Full-text search for messages within a specific chat.
   * Uses MongoDB's text index for fast searching.
   *
   * Query params:
   *   q — The search query string
   */
  static async searchMessages(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { chatId } = req.params;
      const query = req.query.q as string;

      if (!query) {
        res.status(400).json({ message: 'Search query (q) is required' });
        return;
      }

      // Authorization: verify user is a member of this chat
      if (!(await verifyMembership(req, res, chatId))) return;

      const messages = await MessageService.searchMessages(chatId, query);
      res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/messages/:messageId
   * Soft-deletes a message (only the sender can delete their own messages).
   */
  static async deleteMessage(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { messageId } = req.params;

      const deleted = await MessageService.deleteMessage(messageId, req.user!.id);

      if (!deleted) {
        res.status(404).json({ message: 'Message not found or you are not the sender' });
        return;
      }

      res.status(200).json({ message: deleted });
    } catch (error) {
      next(error);
    }
  }
}
