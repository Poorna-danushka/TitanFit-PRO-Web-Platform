import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  clearAllConversations,
  getAIHealth,
} from '../controllers/aiController.js';

const router = express.Router();

// Protected routes
router.post('/chat', authMiddleware, sendMessage);
router.get('/conversations', authMiddleware, getConversations);
router.get('/conversations/:conversationId', authMiddleware, getConversation);
router.delete('/conversations/:conversationId', authMiddleware, deleteConversation);
router.delete('/conversations', authMiddleware, clearAllConversations);

// Health check
router.get('/health', getAIHealth);

export default router;
