import AIConversation from '../models/AIConversation.js';
import AIMessage from '../models/AIMessage.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { aiService } from '../services/aiService.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Send AI message with database-aware context
 * POST /api/v1/ai/chat
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new ValidationError('Message is required');
  }

  // Fetch authenticated user to get role
  const user = await User.findById(req.userId).select('role').lean();
  const userRole = user?.role || 'MEMBER';

  let conversation = null;

  if (conversationId) {
    conversation = await AIConversation.findOne({
      _id: conversationId,
      userId: req.userId,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation');
    }
  } else {
    conversation = new AIConversation({
      userId: req.userId,
      title: message.substring(0, 50),
    });
    await conversation.save();
  }

  const userMessage = new AIMessage({
    conversationId: conversation._id,
    sender: 'USER',
    content: message.trim(),
  });

  await userMessage.save();

  // Process message through Database-Aware Production AI Service
  let aiResponseText;
  try {
    aiResponseText = await aiService.processChatMessage(req.userId, userRole, message.trim());
  } catch (error) {
    logger.error(`[AIController] Error generating AI response: ${error.message}`);
    aiResponseText = "I'm temporarily unable to complete your request. Please try again shortly.";
  }

  const aiMessage = new AIMessage({
    conversationId: conversation._id,
    sender: 'AI',
    content: aiResponseText,
  });

  await aiMessage.save();

  conversation.lastMessageAt = new Date();
  await conversation.save();

  logger.info(`AI message sent for user ${req.userId} (conversation ${conversation._id})`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      conversation,
      userMessage,
      aiMessage,
      text: aiResponseText,
    },
  });
});

/**
 * Get conversations
 * GET /api/v1/ai/conversations
 */
export const getConversations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const conversations = await AIConversation.find({ userId: req.userId })
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ lastMessageAt: -1 });

  const total = await AIConversation.countDocuments({ userId: req.userId });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: conversations,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get conversation with messages
 * GET /api/v1/ai/conversations/:conversationId
 */
export const getConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await AIConversation.findOne({
    _id: conversationId,
    userId: req.userId,
  });

  if (!conversation) {
    throw new NotFoundError('Conversation');
  }

  const messages = await AIMessage.find({ conversationId }).sort({ createdAt: 1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      conversation,
      messages,
    },
  });
});

/**
 * Delete conversation
 * DELETE /api/v1/ai/conversations/:conversationId
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  const conversation = await AIConversation.findOneAndDelete({
    _id: conversationId,
    userId: req.userId,
  });

  if (!conversation) {
    throw new NotFoundError('Conversation');
  }

  await AIMessage.deleteMany({ conversationId });

  logger.info(`AI conversation deleted: ${conversationId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Conversation deleted successfully',
  });
});

/**
 * Clear all conversations
 * DELETE /api/v1/ai/conversations
 */
export const clearAllConversations = asyncHandler(async (req, res) => {
  const conversations = await AIConversation.find({ userId: req.userId });
  const conversationIds = conversations.map((c) => c._id);

  await AIConversation.deleteMany({ userId: req.userId });
  await AIMessage.deleteMany({ conversationId: { $in: conversationIds } });

  logger.info(`All AI conversations cleared for user ${req.userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'All conversations cleared successfully',
  });
});

/**
 * Get AI health status
 * GET /api/v1/ai/health
 */
export const getAIHealth = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      status: 'ONLINE',
      mode: process.env.AI_API_KEY ? 'EXTERNAL_API' : 'DATABASE_AWARE_ENGINE',
      model: process.env.AI_MODEL || 'Production-Ready AI',
    },
  });
});
