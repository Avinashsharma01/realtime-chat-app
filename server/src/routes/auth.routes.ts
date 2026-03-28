// ============================================================================
// Authentication Routes
// ============================================================================
// Maps HTTP endpoints to controller methods:
//   POST /api/auth/register — Public (anyone can register)
//   POST /api/auth/login    — Public (anyone can log in)
//   GET  /api/auth/me       — Protected (requires valid JWT)
// ============================================================================

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected route (requires valid JWT token)
router.get('/me', authenticate, AuthController.me);

export default router;
