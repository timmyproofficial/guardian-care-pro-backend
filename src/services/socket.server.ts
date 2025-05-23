/**
 * WebSocket server implementation
 * Handles real-time chat functionality with Socket.IO
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { chatService } from './chat.service';
import { UserPresenceStatus } from '../models/userPresence.model';
import { UserRole } from '../types/user.types';
import {
  SocketEvents,
//   SocketAuthPayload,
  SocketUser,
  CreateConversationInput,
  SendMessageInput,
  TypingPayload,
  MessageReactionPayload,
  SocketRooms
} from '../types/chat.types';
import User from '../models/user.model';
import Organization from '../models/organization.model';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export interface AuthenticatedSocket extends SocketIOServer {
  user?: SocketUser;
}

/**
 * WebSocket server class
 */
export class SocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.corsOrigin || '*',
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const payload = jwt.verify(token, config.jwt.secret) as { sub: string; role: UserRole };
        
        // Get user details
        const user = await User.findById(payload.sub);
        if (!user) {
          return next(new Error('User not found'));
        }

        // Get user's organizations
        let organizationIds: string[] = [];
        
        if (user.role === UserRole.PARTICIPANT) {
          const participantOrgs = await Organization.find({ participantId: user._id });
          organizationIds = participantOrgs.map(org => (org._id as mongoose.Types.ObjectId).toString());
        } else if (user.role === UserRole.SUPPORT_WORKER) {
          const workerOrgs = await Organization.find({ 'workers.workerId': user._id });
          organizationIds = workerOrgs.map(org => (org._id as mongoose.Types.ObjectId).toString());
        } else if (user.role === UserRole.ADMIN) {
          // Admin has access to all organizations
          const allOrgs = await Organization.find({});
          organizationIds = allOrgs.map(org => (org._id as mongoose.Types.ObjectId).toString());
        }

        // Attach user info to socket
        socket.user = {
          userId: user._id.toString(),
          role: user.role as UserRole,
          organizationIds,
          socketId: socket.id
        };

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on(SocketEvents.CONNECT, (socket: any) => {
      logger.info(`User connected: ${socket.user?.userId} (${socket.id})`);
      
      this.handleUserConnection(socket);
      this.setupSocketEventHandlers(socket);
    });
  }

  /**
   * Handle user connection
   */
  private async handleUserConnection(socket: any): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      // Store user connection
      this.connectedUsers.set(socket.id, user);
      this.userSockets.set(user.userId, socket.id);

      // Update user presence
      await chatService.updateUserPresence(
        user.userId,
        UserPresenceStatus.ONLINE,
        socket.id,
        {
          platform: socket.handshake.headers['user-agent'] || 'unknown',
          userAgent: socket.handshake.headers['user-agent'],
          ipAddress: socket.handshake.address
        }
      );

      // Join user to their personal room
      socket.join(SocketRooms.user(user.userId));

      // Join user to organization rooms
      user.organizationIds.forEach(orgId => {
        socket.join(SocketRooms.organization(orgId));
      });

      // Emit authenticated event
      socket.emit(SocketEvents.AUTHENTICATED, {
        userId: user.userId,
        role: user.role,
        organizationIds: user.organizationIds
      });

      // Notify others about user coming online
      this.broadcastUserPresence(user.userId, UserPresenceStatus.ONLINE);

      // Send online users list
      const onlineUsers = await chatService.getOnlineUsers(user.userId);
      socket.emit(SocketEvents.ONLINE_USERS_LIST, onlineUsers);
    } catch (error) {
      logger.error('Error handling user connection:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Connection setup failed' });
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketEventHandlers(socket: any): void {
    // Conversation events
    socket.on(SocketEvents.CREATE_CONVERSATION, this.handleCreateConversation.bind(this, socket));
    socket.on(SocketEvents.JOIN_CONVERSATION, this.handleJoinConversation.bind(this, socket));
    socket.on(SocketEvents.LEAVE_CONVERSATION, this.handleLeaveConversation.bind(this, socket));
    socket.on(SocketEvents.ADD_MEMBER, this.handleAddMember.bind(this, socket));
    socket.on(SocketEvents.REMOVE_MEMBER, this.handleRemoveMember.bind(this, socket));

    // Message events
    socket.on(SocketEvents.SEND_MESSAGE, this.handleSendMessage.bind(this, socket));
    socket.on(SocketEvents.MESSAGE_READ, this.handleMessageRead.bind(this, socket));
    socket.on(SocketEvents.MESSAGE_REACTION, this.handleMessageReaction.bind(this, socket));

    // Typing events
    socket.on(SocketEvents.TYPING_START, this.handleTypingStart.bind(this, socket));
    socket.on(SocketEvents.TYPING_STOP, this.handleTypingStop.bind(this, socket));

    // Presence events
    socket.on(SocketEvents.USER_STATUS_CHANGE, this.handleStatusChange.bind(this, socket));
    socket.on(SocketEvents.GET_ONLINE_USERS, this.handleGetOnlineUsers.bind(this, socket));

    // Disconnection
    socket.on(SocketEvents.DISCONNECT, this.handleDisconnection.bind(this, socket));
  }

  /**
   * Handle create conversation
   */
  private async handleCreateConversation(socket: any, data: CreateConversationInput): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      const conversation = await chatService.createConversation(user.userId, data);

      // Join creator to conversation room
      socket.join(SocketRooms.conversation(conversation._id.toString()));

      // Notify all members about new conversation
      const memberIds = conversation.members.map(m => m.userId.toString());
      memberIds.forEach(memberId => {
        const memberSocketId = this.userSockets.get(memberId);
        if (memberSocketId && memberSocketId !== socket.id) {
          const memberSocket = this.io.sockets.sockets.get(memberSocketId);
          if (memberSocket) {
            memberSocket.join(SocketRooms.conversation(conversation._id.toString()));
            memberSocket.emit(SocketEvents.CONVERSATION_CREATED, conversation);
          }
        }
      });

      socket.emit(SocketEvents.CONVERSATION_CREATED, conversation);
    } catch (error) {
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to create conversation';
      logger.error('Error creating conversation:', error);
      socket.emit(SocketEvents.ERROR, { message: errorMessage });
    }
  }

  /**
   * Handle join conversation
   */
  private async handleJoinConversation(socket: any, data: { conversationId: string }): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      // Verify user can join conversation (will throw error if not)
      await chatService.getConversationMessages(user.userId, data.conversationId, 1, 1);
      
      socket.join(SocketRooms.conversation(data.conversationId));
      socket.emit(SocketEvents.JOIN_CONVERSATION, { conversationId: data.conversationId });
    } catch (error) {
      logger.error('Error joining conversation:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Cannot join conversation' });
    }
  }

  /**
   * Handle leave conversation
   */
  private handleLeaveConversation(socket: any, data: { conversationId: string }): void {
    socket.leave(SocketRooms.conversation(data.conversationId));
    socket.emit(SocketEvents.LEAVE_CONVERSATION, { conversationId: data.conversationId });
  }

  /**
   * Handle send message
   */
  private async handleSendMessage(socket: any, data: SendMessageInput): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      const message = await chatService.sendMessage(user.userId, data);
      
      // Populate message with sender details
      await message.populate([
        {
          path: 'sender',
          select: 'firstName lastName profileImage role'
        },
        {
          path: 'mentions',
          select: 'firstName lastName'
        }
      ]);

      // Emit to conversation room
      this.io.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.NEW_MESSAGE, message);

      // Send push notifications to offline users
      // This would integrate with your notification service
      // await this.sendMessageNotifications(message, data.conversationId);

      socket.emit(SocketEvents.MESSAGE_SENT, { messageId: message._id, status: 'sent' });
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to send message' });
    }
  }

  /**
   * Handle message read
   */
  private async handleMessageRead(socket: any, data: { conversationId: string; messageIds: string[] }): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      await chatService.markMessagesAsRead(user.userId, data.conversationId, data.messageIds);
      
      // Notify other users in conversation about read receipt
      socket.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.MESSAGE_READ, {
        userId: user.userId,
        messageIds: data.messageIds,
        readAt: new Date()
      });
    } catch (error) {
      logger.error('Error marking messages as read:', error);
    }
  }

  /**
   * Handle message reaction
   */
  private async handleMessageReaction(socket: any, data: MessageReactionPayload): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      if (data.action === 'add') {
        await chatService.addMessageReaction(user.userId, data.messageId, data.emoji);
      } else {
        await chatService.removeMessageReaction(user.userId, data.messageId, data.emoji);
      }

      // Get the updated message to broadcast
    //   const message = await chatService.getConversationMessages(user.userId, '', 1, 1);
      
      // Notify users in the conversation
      this.io.to(SocketRooms.conversation('')).emit(SocketEvents.MESSAGE_REACTION, {
        messageId: data.messageId,
        userId: user.userId,
        emoji: data.emoji,
        action: data.action
      });
    } catch (error) {
      logger.error('Error handling message reaction:', error);
    }
  }

  /**
   * Handle typing start
   */
  private async handleTypingStart(socket: any, data: TypingPayload): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      await chatService.setTypingStatus(user.userId, data.conversationId, true);
      
      // Notify others in conversation
      socket.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.USER_TYPING, {
        userId: user.userId,
        conversationId: data.conversationId,
        isTyping: true
      });
    } catch (error) {
      logger.error('Error handling typing start:', error);
    }
  }

  /**
   * Handle typing stop
   */
  private async handleTypingStop(socket: any, data: TypingPayload): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      await chatService.setTypingStatus(user.userId, data.conversationId, false);
      
      // Notify others in conversation
      socket.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.USER_TYPING, {
        userId: user.userId,
        conversationId: data.conversationId,
        isTyping: false
      });
    } catch (error) {
      logger.error('Error handling typing stop:', error);
    }
  }

  /**
   * Handle status change
   */
  private async handleStatusChange(socket: any, data: { status: UserPresenceStatus }): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      await chatService.updateUserPresence(user.userId, data.status, socket.id);
      
      this.broadcastUserPresence(user.userId, data.status);
    } catch (error) {
      logger.error('Error handling status change:', error);
    }
  }

  /**
   * Handle get online users
   */
  private async handleGetOnlineUsers(socket: any): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      const onlineUsers = await chatService.getOnlineUsers(user.userId);
      socket.emit(SocketEvents.ONLINE_USERS_LIST, onlineUsers);
    } catch (error) {
      logger.error('Error getting online users:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to get online users' });
    }
  }

  /**
   * Handle add member
   */
  private async handleAddMember(socket: any, data: { conversationId: string; memberIds: string[] }): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
    //   const conversation = 
    // await chatService.addMembersToConversation(user.userId, data.conversationId, data.memberIds);
      
      // Add new members to conversation room
      data.memberIds.forEach(memberId => {
        const memberSocketId = this.userSockets.get(memberId);
        if (memberSocketId) {
          const memberSocket = this.io.sockets.sockets.get(memberSocketId);
          if (memberSocket) {
            memberSocket.join(SocketRooms.conversation(data.conversationId));
          }
        }
      });

      // Notify all members about new additions
      this.io.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.MEMBER_ADDED, {
        conversationId: data.conversationId,
        memberIds: data.memberIds,
        addedBy: user.userId
      });
    } catch (error) {
      logger.error('Error adding member:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to add member' });
    }
  }

  /**
   * Handle remove member
   */
  private async handleRemoveMember(socket: any, data: { conversationId: string; memberId: string }): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      await chatService.removeMemberFromConversation(user.userId, data.conversationId, data.memberId);
      
      // Remove member from conversation room
      const memberSocketId = this.userSockets.get(data.memberId);
      if (memberSocketId) {
        const memberSocket = this.io.sockets.sockets.get(memberSocketId);
        if (memberSocket) {
          memberSocket.leave(SocketRooms.conversation(data.conversationId));
        }
      }

      // Notify all members about removal
      this.io.to(SocketRooms.conversation(data.conversationId)).emit(SocketEvents.MEMBER_REMOVED, {
        conversationId: data.conversationId,
        memberId: data.memberId,
        removedBy: user.userId
      });
    } catch (error) {
      logger.error('Error removing member:', error);
      socket.emit(SocketEvents.ERROR, { message: 'Failed to remove member' });
    }
  }

  /**
   * Handle user disconnection
   */
  private async handleDisconnection(socket: any): Promise<void> {
    try {
      const user = socket.user as SocketUser;
      
      if (user) {
        logger.info(`User disconnected: ${user.userId} (${socket.id})`);
        
        // Update user presence to offline
        await chatService.updateUserPresence(user.userId, UserPresenceStatus.OFFLINE);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.id);
        this.userSockets.delete(user.userId);
        
        // Clear typing status
        await chatService.setTypingStatus(user.userId, '', false);
        
        // Broadcast user offline status
        this.broadcastUserPresence(user.userId, UserPresenceStatus.OFFLINE);
      }
    } catch (error) {
      logger.error('Error handling disconnection:', error);
    }
  }

  /**
   * Broadcast user presence to relevant users
   */
  private broadcastUserPresence(userId: string, status: UserPresenceStatus): void {
    // Broadcast to user's organization rooms
    const user = Array.from(this.connectedUsers.values()).find(u => u.userId === userId);
    
    if (user) {
      user.organizationIds.forEach(orgId => {
        this.io.to(SocketRooms.organization(orgId)).emit(SocketEvents.USER_STATUS_CHANGE, {
          userId,
          status,
          timestamp: new Date()
        });
      });
    }
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Send message to conversation
   */
  public sendToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(SocketRooms.conversation(conversationId)).emit(event, data);
  }

  /**
   * Send message to organization
   */
  public sendToOrganization(organizationId: string, event: string, data: any): void {
    this.io.to(SocketRooms.organization(organizationId)).emit(event, data);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users in organization
   */
  public getOrganizationUsers(organizationId: string): SocketUser[] {
    return Array.from(this.connectedUsers.values()).filter(user =>
      user.organizationIds.includes(organizationId)
    );
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Clean up typing indicators (called periodically)
   */
  public async cleanupTypingIndicators(): Promise<void> {
    try {
      // Remove typing indicators older than 10 seconds
    //   const cutoffTime = new Date(Date.now() - 10 * 1000);
      
      // This would be implemented in the database cleanup
      // For now, we'll emit stop typing for all active typing users
      this.connectedUsers.forEach(user => {
        chatService.setTypingStatus(user.userId, '', false);
      });
    } catch (error) {
      logger.error('Error cleaning up typing indicators:', error);
    }
  }
}

// Singleton instance
let socketServerInstance: SocketServer | null = null;

/**
 * Initialize socket server
 */
export const initializeSocketServer = (httpServer: HTTPServer): SocketServer => {
  if (!socketServerInstance) {
    socketServerInstance = new SocketServer(httpServer);
    
    // Setup periodic cleanup
    setInterval(() => {
      socketServerInstance?.cleanupTypingIndicators();
    }, 10000); // Every 10 seconds
  }
  
  return socketServerInstance;
};

/**
 * Get socket server instance
 */
export const getSocketServer = (): SocketServer | null => {
  return socketServerInstance;
};

export default SocketServer;