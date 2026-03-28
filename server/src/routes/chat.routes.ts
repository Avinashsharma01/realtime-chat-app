// ============================================================================
// Chat Routes
// ============================================================================
// Maps HTTP endpoints to controller methods:
//   GET    /api/chats              — Get all chats (protected)
//   POST   /api/chats              — Create 1-on-1 chat (protected)
//   POST   /api/chats/group        — Create group chat (protected)
//   GET    /api/chats/:id          — Get chat by ID (protected)
//   PUT    /api/chats/:id/rename   — Rename group (protected)
//   POST   /api/chats/:id/members  — Add member to group (protected)
//   DELETE /api/chats/:id/members/:userId — Remove member (protected)
//   PUT    /api/chats/:id/members/:userId/admin — Promote to admin (protected)
//   POST   /api/chats/:id/leave    — Leave group (protected)
// ============================================================================

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── General chat routes ─────────────────────────────────────────────────────
router.get('/', authenticate, ChatController.getUserChats);
router.post('/', authenticate, ChatController.createChat);

// ── Group chat routes (must come BEFORE /:id to avoid route conflict) ───────
router.post('/group', authenticate, ChatController.createGroup);

// ── Single chat routes ──────────────────────────────────────────────────────
router.get('/:id', authenticate, ChatController.getChatById);

// ── Group management routes ─────────────────────────────────────────────────
router.put('/:id/rename', authenticate, ChatController.renameGroup);
router.post('/:id/members', authenticate, ChatController.addMember);
router.delete('/:id/members/:userId', authenticate, ChatController.removeMember);
router.put('/:id/members/:userId/admin', authenticate, ChatController.makeAdmin);
router.post('/:id/leave', authenticate, ChatController.leaveGroup);

export default router;
