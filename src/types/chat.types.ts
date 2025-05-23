/**
 * Type definitions for chat-related entities
 * Includes enums and interfaces for chat functionality
 */

// import mongoose from 'mongoose';
import { UserRole } from './user.types';

/**
 * Socket event types for real-time communication
 */
export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // Authentication
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication_error',
  
  // Presence events
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_STATUS_CHANGE = 'user_status_change',
  GET_ONLINE_USERS = 'get_online_users',
  ONLINE_USERS_LIST = 'online_users_list',
  
  // Conversation events
  JOIN_CONVERSATION = 'join_conversation',
  LEAVE_CONVERSATION = 'leave_conversation',
  CREATE_CONVERSATION = 'create_conversation',
  CONVERSATION_CREATED = 'conversation_created',
  ADD_MEMBER = 'add_member',
  REMOVE_MEMBER = 'remove_member',
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  
  // Message events
  SEND_MESSAGE = 'send_message',
  MESSAGE_SENT = 'message_sent',
  NEW_MESSAGE = 'new_message',
  MESSAGE_DELIVERED = 'message_delivered',
  MESSAGE_READ = 'message_read',
  MESSAGE_REACTION = 'message_reaction',
  MESSAGE_EDIT = 'message_edit',
  MESSAGE_DELETE = 'message_delete',
  
  // Typing events
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',
  USER_TYPING = 'user_typing',
  
  // File upload events
  FILE_UPLOAD_START = 'file_upload_start',
  FILE_UPLOAD_PROGRESS = 'file_upload_progress',
  FILE_UPLOAD_COMPLETE = 'file_upload_complete',
  FILE_UPLOAD_ERROR = 'file_upload_error',
  
  // Error events
  ERROR = 'error',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_ERROR = 'permission_error'
}

/**
 * Socket authentication payload
 */
export interface SocketAuthPayload {
  token: string;
  deviceInfo?: {
    platform: string;
    userAgent: string;
  };
}

/**
 * Authenticated socket user interface
 */
export interface SocketUser {
  userId: string;
  role: UserRole;
  organizationIds: string[];
  socketId: string;
}

/**
 * Conversation creation input
 */
export interface CreateConversationInput {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  memberIds: string[];
  organizationId?: string;
}

/**
 * Message input for sending
 */
export interface SendMessageInput {
  conversationId: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  content?: string;
  replyTo?: string;
  mentions?: string[];
  attachments?: {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnail?: string;
  }[];
}

/**
 * Typing indicator payload
 */
export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

/**
 * Message reaction payload
 */
export interface MessageReactionPayload {
  messageId: string;
  emoji: string;
  action: 'add' | 'remove';
}

/**
 * File upload progress payload
 */
export interface FileUploadProgress {
  uploadId: string;
  progress: number;
  loaded: number;
  total: number;
}

/**
 * Privacy check result
 */
export interface PrivacyCheckResult {
  canChat: boolean;
  reason?: string;
  organizationId?: string;
}

/**
 * Conversation member info
 */
export interface ConversationMemberInfo {
  userId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileImage?: string;
  isOnline: boolean;
  lastSeen?: Date;
  organizationId?: string;
}

/**
 * Chat privacy validation interface
 */
export interface ChatPrivacyValidator {
  canDirectMessage(fromUserId: string, toUserId: string): Promise<PrivacyCheckResult>;
  canCreateGroupChat(creatorId: string, memberIds: string[]): Promise<PrivacyCheckResult>;
  canAddToGroupChat(adderId: string, conversationId: string, newMemberIds: string[]): Promise<PrivacyCheckResult>;
  getSharedOrganizations(userId1: string, userId2: string): Promise<string[]>;
}

/**
 * Socket room naming conventions
 */
export class SocketRooms {
  static user(userId: string): string {
    return `user:${userId}`;
  }
  
  static conversation(conversationId: string): string {
    return `conversation:${conversationId}`;
  }
  
  static organization(organizationId: string): string {
    return `organization:${organizationId}`;
  }
  
  static typing(conversationId: string): string {
    return `typing:${conversationId}`;
  }
}

/**
 * Chat notification types
 */
export enum ChatNotificationType {
  NEW_MESSAGE = 'new_message',
  MENTION = 'mention',
  CONVERSATION_INVITE = 'conversation_invite',
  FILE_SHARED = 'file_shared'
}

/**
 * Chat notification payload
 */
export interface ChatNotification {
  type: ChatNotificationType;
  conversationId: string;
  messageId?: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}