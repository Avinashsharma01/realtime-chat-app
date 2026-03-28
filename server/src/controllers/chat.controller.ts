// ============================================================================
// Chat Controller
// ============================================================================
// Handles HTTP requests for chat-related endpoints:
//   GET    /api/chats              — Get all chats for the current user
//   POST   /api/chats              — Create a new 1-on-1 chat
//   POST   /api/chats/group        — Create a new group chat
//   GET    /api/chats/:id          — Get a specific chat by ID
//   PUT    /api/chats/:id/rename   — Rename a group
//   POST   /api/chats/:id/members  — Add a member to a group
//   DELETE /api/chats/:id/members/:userId — Remove a member from a group
//   PUT    /api/chats/:id/members/:userId/admin — Promote to admin
//   POST   /api/chats/:id/leave    — Leave a group
//
// All routes require authentication.
// ============================================================================

import { Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { AuthRequest } from '../types';

export class ChatController {
  // ── 1-on-1 Chat ─────────────────────────────────────────────────────────

  /** GET /api/chats — Returns all chats (1-on-1 + groups) for the user */
  static async getUserChats(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chats = await ChatService.getUserChats(req.user!.id);
      res.status(200).json({ chats });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/chats — Create a new 1-on-1 chat */
  static async createChat(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { participantId } = req.body;

      if (!participantId) {
        res.status(400).json({ message: 'participantId is required' });
        return;
      }

      if (participantId === req.user!.id) {
        res.status(400).json({ message: 'Cannot create a chat with yourself' });
        return;
      }

      const chat = await ChatService.getOrCreateChat(req.user!.id, participantId);
      res.status(201).json({ chat });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/chats/:id — Get a specific chat by ID */
  static async getChatById(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chat = await ChatService.getChatById(req.params.id, req.user!.id);

      if (!chat) {
        res.status(404).json({ message: 'Chat not found' });
        return;
      }

      res.status(200).json({ chat });
    } catch (error) {
      next(error);
    }
  }

  // ── Group Chat ──────────────────────────────────────────────────────────

  /** POST /api/chats/group — Create a new group chat */
  static async createGroup(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { name, participantIds } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ message: 'Group name is required' });
        return;
      }

      if (!Array.isArray(participantIds) || participantIds.length < 1) {
        res.status(400).json({ message: 'At least one other participant is required' });
        return;
      }

      const group = await ChatService.createGroup(
        req.user!.id,
        name.trim(),
        participantIds,
      );
      res.status(201).json({ chat: group });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/chats/:id/rename — Rename a group */
  static async renameGroup(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ message: 'New name is required' });
        return;
      }

      const chat = await ChatService.renameGroup(req.params.id, req.user!.id, name.trim());
      res.status(200).json({ chat });
    } catch (error) {
      if ((error as Error).message.includes('Only admins')) {
        res.status(403).json({ message: (error as Error).message });
        return;
      }
      next(error);
    }
  }

  /** POST /api/chats/:id/members — Add a member to a group */
  static async addMember(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'userId is required' });
        return;
      }

      const chat = await ChatService.addMember(req.params.id, req.user!.id, userId);
      res.status(200).json({ chat });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('Only admins') || msg.includes('Cannot add')) {
        res.status(403).json({ message: msg });
        return;
      }
      if (msg.includes('already a member')) {
        res.status(409).json({ message: msg });
        return;
      }
      next(error);
    }
  }

  /** DELETE /api/chats/:id/members/:userId — Remove a member from a group */
  static async removeMember(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chat = await ChatService.removeMember(
        req.params.id,
        req.user!.id,
        req.params.userId,
      );
      res.status(200).json({ chat, message: chat ? 'Member removed' : 'Group deleted' });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('Only admins') || msg.includes('Cannot remove') || msg.includes('Promote')) {
        res.status(403).json({ message: msg });
        return;
      }
      next(error);
    }
  }

  /** POST /api/chats/:id/leave — Leave a group (removes self) */
  static async leaveGroup(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chat = await ChatService.removeMember(
        req.params.id,
        req.user!.id,
        req.user!.id, // target = self
      );
      res.status(200).json({ chat, message: 'Left the group' });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('Promote')) {
        res.status(403).json({ message: msg });
        return;
      }
      next(error);
    }
  }

  /** PUT /api/chats/:id/members/:userId/admin — Promote a member to admin */
  static async makeAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chat = await ChatService.makeAdmin(
        req.params.id,
        req.user!.id,
        req.params.userId,
      );
      res.status(200).json({ chat });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('Only admins') || msg.includes('not in')) {
        res.status(403).json({ message: msg });
        return;
      }
      next(error);
    }
  }
}
