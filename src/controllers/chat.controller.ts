/**
 * Chat controller
 * Handles HTTP requests related to chat functionality
 */

import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { chatService } from '../services/chat.service';
import { ConversationType } from '../models/conversation.model';
import { successResponse, errorResponse } from '../utils/api-response';
import { uploadProfileImage } from '../utils/cloudinary';
import { getSocketServer } from '../services/socket.server';
import { SocketEvents } from '../types/chat.types';
import fs from 'fs';

export const chatController = {
  /**
   * Create a new conversation
   * @route POST /api/chat/conversations
   */
  createConversation: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { type, name, description, memberIds, organizationId } = req.body;

      const conversation = await chatService.createConversation(userId, {
        type: type as ConversationType,
        name,
        description,
        memberIds,
        organizationId
      });

      // Populate conversation details
      await conversation.populate([
        {
          path: 'members.userId',
          select: 'firstName lastName profileImage role'
        },
        {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      ]);

      return res.status(httpStatus.CREATED).json(
        successResponse({ conversation }, 'Conversation created successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get user's conversations
   * @route GET /api/chat/conversations
   */
  getConversations: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await chatService.getUserConversations(userId, page, limit);

      return res.json(
        successResponse(
          {
            conversations: result.conversations,
            pagination: {
              currentPage: page,
              totalCount: result.totalCount,
              hasMore: result.hasMore,
              limit
            }
          },
          'Conversations retrieved successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get conversation messages
   * @route GET /api/chat/conversations/:conversationId/messages
   */
  getMessages: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await chatService.getConversationMessages(userId, conversationId, page, limit);

      return res.json(
        successResponse(
          {
            messages: result.messages,
            pagination: {
              currentPage: page,
              totalCount: result.totalCount,
              hasMore: result.hasMore,
              limit
            }
          },
          'Messages retrieved successfully'
        )
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Send a message
   * @route POST /api/chat/conversations/:conversationId/messages
   */
  sendMessage: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { conversationId } = req.params;
      const { content, replyTo, mentions } = req.body;
      let  { type } = req.body;

      // Handle file attachments
      const attachments: any[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Upload files to cloudinary
        for (const file of req.files) {
          try {
            const uploadResult = await uploadProfileImage(file.path, `chat-${Date.now()}`);
            attachments.push({
              url: uploadResult.secure_url,
              filename: file.originalname,
              size: file.size,
              mimeType: file.mimetype,
              thumbnail: uploadResult.secure_url // For now, use same URL as thumbnail
            });

            // Clean up temp file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            // Clean up temp file on error
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }
        }

        // If files were uploaded, set type accordingly
        if (attachments.length > 0 && !type) {
          const firstFile = attachments[0];
          if (firstFile.mimeType.startsWith('image/')) {
            type = 'image';
          } else if (firstFile.mimeType.startsWith('video/')) {
            type = 'video';
          } else if (firstFile.mimeType.startsWith('audio/')) {
            type = 'audio';
          } else {
            type = 'file';
          }
        }
      }

      const message = await chatService.sendMessage(userId, {
        conversationId,
        type: type || 'text',
        content,
        replyTo,
        mentions,
        attachments
      });

      // Populate message details
      await message.populate([
        {
          path: 'sender',
          select: 'firstName lastName profileImage role'
        },
        {
          path: 'replyTo',
          select: 'content sender type',
          populate: {
            path: 'sender',
            select: 'firstName lastName'
          }
        },
        {
          path: 'mentions',
          select: 'firstName lastName'
        }
      ]);

      // Emit via WebSocket
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.sendToConversation(conversationId, SocketEvents.NEW_MESSAGE, message);
      }

      return res.status(httpStatus.CREATED).json(
        successResponse({ message }, 'Message sent successfully')
      );
    } catch (error) {
      // Clean up any uploaded files on error
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return next(error);
    }
  },

  /**
   * Mark messages as read
   * @route POST /api/chat/conversations/:conversationId/read
   */
  markAsRead: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { conversationId } = req.params;
      const { messageIds } = req.body;

      await chatService.markMessagesAsRead(userId, conversationId, messageIds);

      // Emit via WebSocket
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.sendToConversation(conversationId, SocketEvents.MESSAGE_READ, {
          userId,
          messageIds,
          readAt: new Date()
        });
      }

      return res.json(
        successResponse({}, 'Messages marked as read')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Add reaction to message
   * @route POST /api/chat/messages/:messageId/reactions
   */
  addReaction: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { messageId } = req.params;
      const { emoji } = req.body;

      await chatService.addMessageReaction(userId, messageId, emoji);

      return res.json(
        successResponse({}, 'Reaction added successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Remove reaction from message
   * @route DELETE /api/chat/messages/:messageId/reactions/:emoji
   */
  removeReaction: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { messageId, emoji } = req.params;

      await chatService.removeMessageReaction(userId, messageId, decodeURIComponent(emoji));

      return res.json(
        successResponse({}, 'Reaction removed successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Add members to conversation
   * @route POST /api/chat/conversations/:conversationId/members
   */
  addMembers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { conversationId } = req.params;
      const { memberIds } = req.body;

      const conversation = await chatService.addMembersToConversation(userId, conversationId, memberIds);

      // Emit via WebSocket
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.sendToConversation(conversationId, SocketEvents.MEMBER_ADDED, {
          conversationId,
          memberIds,
          addedBy: userId
        });
      }

      return res.json(
        successResponse({ conversation }, 'Members added successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Remove member from conversation
   * @route DELETE /api/chat/conversations/:conversationId/members/:memberId
   */
  removeMember: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { conversationId, memberId } = req.params;

      const conversation = await chatService.removeMemberFromConversation(userId, conversationId, memberId);

      // Emit via WebSocket
      const socketServer = getSocketServer();
      if (socketServer) {
        socketServer.sendToConversation(conversationId, SocketEvents.MEMBER_REMOVED, {
          conversationId,
          memberId,
          removedBy: userId
        });
      }

      return res.json(
        successResponse({ conversation }, 'Member removed successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Search conversations and messages
   * @route GET /api/chat/search
   */
  search: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const { q: query, limit } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('Search query is required', httpStatus.BAD_REQUEST)
        );
      }

      const results = await chatService.searchConversations(
        userId,
        query,
        parseInt(limit as string) || 20
      );

      return res.json(
        successResponse(results, 'Search completed successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Get online users
   * @route GET /api/chat/users/online
   */
  getOnlineUsers: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      const userId = req.user._id.toString();
      const onlineUsers = await chatService.getOnlineUsers(userId);

      return res.json(
        successResponse({ onlineUsers }, 'Online users retrieved successfully')
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Upload chat file
   * @route POST /api/chat/upload
   */
  uploadFile: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(httpStatus.UNAUTHORIZED).json(
          errorResponse('Unauthorized: User not found on request', httpStatus.UNAUTHORIZED)
        );
      }

      if (!req.file) {
        return res.status(httpStatus.BAD_REQUEST).json(
          errorResponse('No file provided', httpStatus.BAD_REQUEST)
        );
      }

      const file = req.file;
      
      try {
        // Upload to cloudinary
        const uploadResult = await uploadProfileImage(file.path, `chat-${Date.now()}`);
        
        // Clean up temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        const fileData = {
          url: uploadResult.secure_url,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          thumbnail: uploadResult.secure_url
        };

        return res.json(
          successResponse({ file: fileData }, 'File uploaded successfully')
        );
      } catch (uploadError) {
        // Clean up temp file on error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw uploadError;
      }
    } catch (error) {
      return next(error);
    }
  }
};