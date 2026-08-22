import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  getMemberProfile,
  updateMemberProfile,
  getMember,
  listMembers,
  deleteMember,
} from '../controllers/memberController.js';
import { validate, updateProfileValidator } from '../validators/index.js';

const router = express.Router();

// Protected routes
router.get('/profile', authMiddleware, getMemberProfile);
router.put('/profile', authMiddleware, validate(updateProfileValidator), updateMemberProfile);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, listMembers);
router.get('/:memberId', authMiddleware, adminMiddleware, getMember);
router.delete('/:memberId', authMiddleware, adminMiddleware, deleteMember);

export default router;
