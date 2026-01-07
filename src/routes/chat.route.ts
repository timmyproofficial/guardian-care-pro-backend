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
 * @swagger
 * /api/v1/chat/conversations:
 *   post:
 *     summary: Create a new conversation
 *     description: Create a new conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/conversations',
  authenticate,
  validate(chatValidation.createConversation),
  chatController.createConversation
);

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get user's conversations
 *     description: Get user's conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/conversations',
  authenticate,
  chatController.getConversations
);

/**
 * @swagger
 * /api/v1/chat/conversations/:conversationId/messages:
 *   get:
 *     summary: Get messages from a conversation
 *     description: Get messages from a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversationId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  chatController.getMessages
);

/**
 * @swagger
 * /api/v1/chat/conversations/:conversationId/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     description: Send a message in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/conversations/:conversationId/messages',
  authenticate,
  uploadTimesheetData, // Handle file uploads
  validate(chatValidation.sendMessage),
  chatController.sendMessage
);

/**
 * @swagger
 * /api/v1/chat/conversations/:conversationId/read:
 *   post:
 *     summary: Mark messages as read
 *     description: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/conversations/:conversationId/read',
  authenticate,
  validate(chatValidation.markAsRead),
  chatController.markAsRead
);

/**
 * @swagger
 * /api/v1/chat/conversations/:conversationId/members:
 *   post:
 *     summary: Add members to conversation
 *     description: Add members to conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/conversations/:conversationId/members',
  authenticate,
  validate(chatValidation.addMembers),
  chatController.addMembers
);

/**
 * @swagger
 * /api/v1/chat/conversations/:conversationId/members/:memberId:
 *   delete:
 *     summary: Remove member from conversation
 *     description: Remove member from conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversationId
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: The memberId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.delete(
  '/conversations/:conversationId/members/:memberId',
  authenticate,
  chatController.removeMember
);

/**
 * @swagger
 * /api/v1/chat/messages/:messageId/reactions:
 *   post:
 *     summary: Add reaction to message
 *     description: Add reaction to message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: The messageId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.post(
  '/messages/:messageId/reactions',
  authenticate,
  validate(chatValidation.addReaction),
  chatController.addReaction
);

/**
 * @swagger
 * /api/v1/chat/messages/:messageId/reactions/:emoji:
 *   delete:
 *     summary: Remove reaction from message
 *     description: Remove reaction from message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: The messageId
 *       - in: path
 *         name: emoji
 *         required: true
 *         schema:
 *           type: string
 *         description: The emoji
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.delete(
  '/messages/:messageId/reactions/:emoji',
  authenticate,
  chatController.removeReaction
);

/**
 * @swagger
 * /api/v1/chat/search:
 *   get:
 *     summary: Search conversations and messages
 *     description: Search conversations and messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/search',
  authenticate,
  chatController.search
);

/**
 * @swagger
 * /api/v1/chat/users/online:
 *   get:
 *     summary: Get online users
 *     description: Get online users
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/users/online',
  authenticate,
  chatController.getOnlineUsers
);

/**
 * @swagger
 * /api/v1/chat/upload:
 *   post:
 *     summary: Upload file for chat
 *     description: Upload file for chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/upload',
  authenticate,
  uploadTimesheetData,
  chatController.uploadFile
);

export default router;