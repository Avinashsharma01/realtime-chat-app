// ============================================================================
// Message Routes
// ============================================================================
// Maps HTTP endpoints to controller methods:
//   GET  /api/messages/:chatId         — Get messages with pagination
//   POST /api/messages/:chatId         — Send a message (REST fallback)
//   GET  /api/messages/:chatId/search  — Full-text search in chat
//
// The /search route must come BEFORE any generic /:param routes.
// ============================================================================

import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All message routes require authentication
router.get('/:chatId', authenticate, MessageController.getChatMessages);
router.post('/:chatId', authenticate, MessageController.sendMessage);
router.get('/:chatId/search', authenticate, MessageController.searchMessages);
router.delete('/:messageId', authenticate, MessageController.deleteMessage);

export default router;
