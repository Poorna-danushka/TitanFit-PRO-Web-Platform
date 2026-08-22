import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import { aiService } from '../services/aiService.js';

const router = express.Router();

/**
 * POST /api/v1/chat
 * Database-Aware AI Chat endpoint supporting SSE streaming & production deployment
 */
router.post('/', optionalAuth, async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Fetch authenticated user role if present
  let userRole = 'MEMBER';
  if (req.userId) {
    const user = await User.findById(req.userId).select('role').lean();
    if (user?.role) userRole = user.role;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Generate database-aware AI response
    const responseText = await aiService.processChatMessage(req.userId, userRole, message.trim(), history);

    // Stream out chunks
    const chunkSize = 15;
    for (let i = 0; i < responseText.length; i += chunkSize) {
      const token = responseText.slice(i, i + chunkSize);
      sendEvent({ token });
      await new Promise((r) => setTimeout(r, 20));
    }

    sendEvent({ done: true });
  } catch (err) {
    console.error('[ChatRoute] Response error:', err.message);
    sendEvent({ error: 'An unexpected error occurred. Please try again.' });
  } finally {
    res.end();
  }
});

export default router;
