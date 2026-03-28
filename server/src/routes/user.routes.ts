// ============================================================================
// User Routes
// ============================================================================
// Maps HTTP endpoints to controller methods:
//   GET /api/users         — Get all users (protected)
//   GET /api/users/search  — Search users (protected)
//   GET /api/users/:id     — Get user by ID (protected)
//
// All routes are protected — you must be logged in to see other users.
// Note: /search must come BEFORE /:id to avoid "search" being treated as an ID.
// ============================================================================

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.get('/', authenticate, UserController.getAllUsers);
router.get('/search', authenticate, UserController.searchUsers);  // Must be before /:id
router.put('/profile', authenticate, UserController.updateProfile); // Must be before /:id
router.get('/:id', authenticate, UserController.getUserById);

export default router;
