/**
 * Chat routes
 * HTTP endpoints for chat functionality
 */

import express from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import validate from '../middlewares/validate.middleware';
import { chatValidation } from '../utils/validation';
import { uploadTimesheetData } from '../utils/multer'; // Reuse existing multer config

const router = express.Router();

/**
 * @route POST /api/chat/conversations
 * @desc Create a new conversation
 * @access Private
 */
router.post(
  '/conversations',
  authenticate,
  validate(chatValidation.createConversation),
  chatController.createConversation
);

/**
 * @route GET /api/chat/conversations
 * @desc Get user's conversations
 * @access Private
 */
router.get(
  '/conversations',
  authenticate,
  chatController.getConversations
);

/**
 * @route GET /api/chat/conversations/:conversationId/messages
 * @desc Get messages from a conversation
 * @access Private
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  chatController.getMessages
);

/**
 * @route POST /api/chat/conversations/:conversationId/messages
 * @desc Send a message in a conversation
 * @access Private
 */
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  uploadTimesheetData, // Handle file uploads
  validate(chatValidation.sendMessage),
  chatController.sendMessage
);

/**
 * @route POST /api/chat/conversations/:conversationId/read
 * @desc Mark messages as read
 * @access Private
 */
router.post(
  '/conversations/:conversationId/read',
  authenticate,
  validate(chatValidation.markAsRead),
  chatController.markAsRead
);

/**
 * @route POST /api/chat/conversations/:conversationId/members
 * @desc Add members to conversation
 * @access Private
 */
router.post(
  '/conversations/:conversationId/members',
  authenticate,
  validate(chatValidation.addMembers),
  chatController.addMembers
);

/**
 * @route DELETE /api/chat/conversations/:conversationId/members/:memberId
 * @desc Remove member from conversation
 * @access Private
 */
router.delete(
  '/conversations/:conversationId/members/:memberId',
  authenticate,
  chatController.removeMember
);

/**
 * @route POST /api/chat/messages/:messageId/reactions
 * @desc Add reaction to message
 * @access Private
 */
router.post(
  '/messages/:messageId/reactions',
  authenticate,
  validate(chatValidation.addReaction),
  chatController.addReaction
);

/**
 * @route DELETE /api/chat/messages/:messageId/reactions/:emoji
 * @desc Remove reaction from message
 * @access Private
 */
router.delete(
  '/messages/:messageId/reactions/:emoji',
  authenticate,
  chatController.removeReaction
);

/**
 * @route GET /api/chat/search
 * @desc Search conversations and messages
 * @access Private
 */
router.get(
  '/search',
  authenticate,
  chatController.search
);

/**
 * @route GET /api/chat/users/online
 * @desc Get online users
 * @access Private
 */
router.get(
  '/users/online',
  authenticate,
  chatController.getOnlineUsers
);

/**
 * @route POST /api/chat/upload
 * @desc Upload file for chat
 * @access Private
 */
router.post(
  '/upload',
  authenticate,
  uploadTimesheetData,
  chatController.uploadFile
);

export default router;