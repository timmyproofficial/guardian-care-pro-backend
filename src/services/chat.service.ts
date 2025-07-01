/**
 * Chat service
 * Handles chat operations with privacy validation and organizational boundaries
 */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Conversation, { IConversation, ConversationType } from '../models/conversation.model';
import Message, { IMessage, MessageType, MessageStatus } from '../models/message.model';
import UserPresence, { IUserPresence, UserPresenceStatus } from '../models/userPresence.model';
import User from '../models/user.model';
import Organization from '../models/organization.model';
import { UserRole } from '../types/user.types';
import { 
  CreateConversationInput, 
  SendMessageInput, 
  PrivacyCheckResult,
  ConversationMemberInfo,
  ChatPrivacyValidator
} from '../types/chat.types';
import ApiError from '../utils/api-error';
import logger from '../utils/logger';

/**
 * Chat privacy validator implementation
 */
class PrivacyValidator implements ChatPrivacyValidator {
  /**
   * Check if user can send direct message to another user
   */
  async canDirectMessage(fromUserId: string, toUserId: string): Promise<PrivacyCheckResult> {
    try {
      const [fromUser, toUser] = await Promise.all([
        User.findById(fromUserId),
        User.findById(toUserId)
      ]);

      if (!fromUser || !toUser) {
        return { canChat: false, reason: 'User not found' };
      }

      // Admins can chat with anyone
      if (fromUser.role === UserRole.ADMIN || toUser.role === UserRole.ADMIN) {
        return { canChat: true };
      }

      // Check if users share an organization
      const sharedOrgs = await this.getSharedOrganizations(fromUserId, toUserId);
      
      if (sharedOrgs.length > 0) {
        return { canChat: true, organizationId: sharedOrgs[0] };
      }

      return { 
        canChat: false, 
        reason: 'Users do not belong to the same organization' 
      };
    } catch (error) {
      logger.error('Error checking direct message permission:', error);
      return { canChat: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check if user can create group chat with specified members
   */
  async canCreateGroupChat(creatorId: string, memberIds: string[]): Promise<PrivacyCheckResult> {
    try {
      const creator = await User.findById(creatorId);
      
      if (!creator) {
        return { canChat: false, reason: 'Creator not found' };
      }

      // Admins can create group with anyone
      if (creator.role === UserRole.ADMIN) {
        return { canChat: true };
      }

      // For participants, all members must be from their organization
      if (creator.role === UserRole.PARTICIPANT) {
        const participantOrg = await Organization.findOne({ participantId: creatorId });
        
        if (!participantOrg) {
          return { canChat: false, reason: 'Participant organization not found' };
        }

        // Check if all members belong to the participant's organization
        const orgWorkerIds = participantOrg.workers.map(w => w.workerId.toString());
        
        for (const memberId of memberIds) {
          if (memberId !== creatorId && !orgWorkerIds.includes(memberId)) {
            return { 
              canChat: false, 
              reason: 'All members must belong to your organization' 
            };
          }
        }

        // return { canChat: true, organizationId: participantOrg._id.toString() };
        return { canChat: true, organizationId: (participantOrg._id as mongoose.Types.ObjectId).toString() };
      }

      // For support workers, check shared organizations
      const allSharedOrgs = await this.getAllSharedOrganizations(creatorId, memberIds);
      
      if (allSharedOrgs.length === 0) {
        return { 
          canChat: false, 
          reason: 'All members must belong to a shared organization' 
        };
      }

      return { canChat: true, organizationId: allSharedOrgs[0] };
    } catch (error) {
      logger.error('Error checking group chat creation permission:', error);
      return { canChat: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check if user can add members to group chat
   */
  async canAddToGroupChat(
    adderId: string, 
    conversationId: string, 
    newMemberIds: string[]
  ): Promise<PrivacyCheckResult> {
    try {
      const [adder, conversation] = await Promise.all([
        User.findById(adderId),
        Conversation.findById(conversationId)
      ]);

      if (!adder || !conversation) {
        return { canChat: false, reason: 'User or conversation not found' };
      }

      // Check if adder is a member of the conversation
      const isMember = conversation.members.some(m => m.userId.toString() === adderId);
      if (!isMember) {
        return { canChat: false, reason: 'Not a member of this conversation' };
      }

      // Admin can add anyone
      if (adder.role === UserRole.ADMIN) {
        return { canChat: true };
      }

      // For organization-based conversations, check organization membership
      if (conversation.organizationId) {
        const organization = await Organization.findById(conversation.organizationId);
        
        if (!organization) {
          return { canChat: false, reason: 'Organization not found' };
        }

        const orgMemberIds = [
          organization.participantId.toString(),
          ...organization.workers.map(w => w.workerId.toString())
        ];

        for (const newMemberId of newMemberIds) {
          if (!orgMemberIds.includes(newMemberId)) {
            return { 
              canChat: false, 
              reason: 'New members must belong to the organization' 
            };
          }
        }
      }

      return { canChat: true };
    } catch (error) {
      logger.error('Error checking add member permission:', error);
      return { canChat: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get organizations shared between two users
   */
  async getSharedOrganizations(userId1: string, userId2: string): Promise<string[]> {
    try {
      const organizations = await Organization.find({
        $or: [
          { 
            participantId: userId1,
            'workers.workerId': userId2
          },
          {
            participantId: userId2,
            'workers.workerId': userId1
          },
          {
            'workers.workerId': { $all: [userId1, userId2] }
          }
        ]
      });

    //   return organizations.map(org => org._id.toString());
      return organizations.map(org => (org._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      logger.error('Error getting shared organizations:', error);
      return [];
    }
  }

  /**
   * Get organizations shared among multiple users
   */
  private async getAllSharedOrganizations(creatorId: string, memberIds: string[]): Promise<string[]> {
    try {
      const allUserIds = [creatorId, ...memberIds];
      
      const organizations = await Organization.find({
        $or: [
          {
            participantId: { $in: allUserIds },
            'workers.workerId': { $in: allUserIds }
          },
          {
            'workers.workerId': { $all: allUserIds }
          }
        ]
      });

    //   return organizations.map(org => org._id.toString());
      return organizations.map(org => (org._id as mongoose.Types.ObjectId).toString());
    } catch (error) {
      logger.error('Error getting all shared organizations:', error);
      return [];
    }
  }
}

/**
 * Chat service implementation
 */
export const chatService = {
  privacyValidator: new PrivacyValidator(),

  /**
   * Create a new conversation
   */
  async createConversation(creatorId: string, input: CreateConversationInput): Promise<IConversation> {
    try {
      // Validate privacy permissions
      const privacyCheck = input.type === ConversationType.DIRECT
        ? await this.privacyValidator.canDirectMessage(creatorId, input.memberIds[0])
        : await this.privacyValidator.canCreateGroupChat(creatorId, input.memberIds);

      if (!privacyCheck.canChat) {
        throw new ApiError(httpStatus.FORBIDDEN, privacyCheck.reason || 'Cannot create conversation');
      }

      // Check if direct conversation already exists
      if (input.type === ConversationType.DIRECT) {
        const existingConversation = await Conversation.findOne({
          type: ConversationType.DIRECT,
          'members.userId': { $all: [creatorId, input.memberIds[0]] },
          isActive: true
        });

        if (existingConversation) {
          return existingConversation;
        }
      }

      // Prepare members array
      const allMemberIds = [creatorId, ...input.memberIds];
      const uniqueMemberIds = [...new Set(allMemberIds)];

      const members = uniqueMemberIds.map(memberId => ({
        userId: new mongoose.Types.ObjectId(memberId),
        joinedAt: new Date(),
        role: memberId === creatorId ? 'admin' : 'member',
        notifications: true
      }));

      // Create conversation
      const conversation = await Conversation.create({
        type: input.type,
        name: input.name,
        description: input.description,
        organizationId: 
            privacyCheck.organizationId ? new mongoose.Types.ObjectId(privacyCheck.organizationId) : undefined,
        members,
        createdBy: new mongoose.Types.ObjectId(creatorId),
        isActive: true
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(senderId: string, input: SendMessageInput): Promise<IMessage> {
    try {
      // Check if user is member of conversation
      const conversation = await Conversation.findById(input.conversationId);
      
      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
      }

      const isMember = conversation.members.some(m => m.userId.toString() === senderId);
      if (!isMember) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Not a member of this conversation');
      }

      // Create message
      const message = await Message.create({
        conversationId: new mongoose.Types.ObjectId(input.conversationId),
        sender: new mongoose.Types.ObjectId(senderId),
        type: input.type || MessageType.TEXT,
        content: input.content,
        attachments: input.attachments || [],
        replyTo: input.replyTo ? new mongoose.Types.ObjectId(input.replyTo) : undefined,
        mentions: input.mentions?.map(id => new mongoose.Types.ObjectId(id)) || [],
        reactions: [],
        readReceipts: [{
          userId: new mongoose.Types.ObjectId(senderId),
          readAt: new Date()
        }],
        status: MessageStatus.SENT
      });

      // Update conversation's last message
      await Conversation.findByIdAndUpdate(input.conversationId, {
        lastMessage: {
          messageId: message._id,
          content: input.content || `[${input.type}]`,
          sender: new mongoose.Types.ObjectId(senderId),
          timestamp: new Date(),
          messageType: input.type || MessageType.TEXT
        },
        updatedAt: new Date()
      });

      return message;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Get conversations for a user
   */
  async getUserConversations(userId: string, page: number = 1, limit: number = 20): Promise<{
    conversations: IConversation[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const skip = (page - 1) * limit;

      const conversations = await Conversation.find({
        'members.userId': userId,
        isActive: true
      })
      .populate([
        {
          path: 'members.userId',
          select: 'firstName lastName profileImage role'
        },
        {
          path: 'lastMessage.sender',
          select: 'firstName lastName'
        }
      ])
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

      const totalCount = await Conversation.countDocuments({
        'members.userId': userId,
        isActive: true
      });

      return {
        conversations,
        totalCount,
        hasMore: skip + conversations.length < totalCount
      };
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  },

  /**
   * Get messages from a conversation
   */
  async getConversationMessages(
    userId: string, 
    conversationId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{
    messages: IMessage[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      // Verify user is member of conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
      }

      const isMember = conversation.members.some(m => m.userId.toString() === userId);
      if (!isMember) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Not a member of this conversation');
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({
        conversationId: conversationId,
        deletedFor: { $ne: userId }
      })
      .populate([
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
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const totalCount = await Message.countDocuments({
        conversationId: conversationId,
        deletedFor: { $ne: userId }
      });

      return {
        messages: messages.reverse(), // Return in chronological order
        totalCount,
        hasMore: skip + messages.length < totalCount
      };
    } catch (error) {
      logger.error('Error getting conversation messages:', error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(userId: string, conversationId: string, messageIds: string[]): Promise<void> {
    try {
      // Verify user is member of conversation
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
      }

      const isMember = conversation.members.some(m => m.userId.toString() === userId);
      if (!isMember) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Not a member of this conversation');
      }

      // Update read receipts for messages
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          conversationId: conversationId,
          'readReceipts.userId': { $ne: userId }
        },
        {
          $push: {
            readReceipts: {
              userId: new mongoose.Types.ObjectId(userId),
              readAt: new Date()
            }
          }
        }
      );

      // Update user's last seen in conversation
      await Conversation.updateOne(
        {
          _id: conversationId,
          'members.userId': userId
        },
        {
          $set: {
            'members.$.lastSeen': new Date()
          }
        }
      );
    } catch (error) {
      logger.error('Error marking messages as read:', error);
      throw error;
    }
  },

  /**
   * Add reaction to message
   */
  async addMessageReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const message = await Message.findById(messageId).populate('conversationId');
      
      if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Message not found');
      }

      // Check if user is member of conversation
      const conversation = await Conversation.findById(message.conversationId);
      const isMember = conversation?.members.some(m => m.userId.toString() === userId);
      
      if (!isMember) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Not a member of this conversation');
      }

      // Remove existing reaction from this user for this emoji
      await Message.updateOne(
        { _id: messageId },
        {
          $pull: {
            reactions: {
              userId: userId,
              emoji: emoji
            }
          }
        }
      );

      // Add new reaction
      await Message.updateOne(
        { _id: messageId },
        {
          $push: {
            reactions: {
              userId: new mongoose.Types.ObjectId(userId),
              emoji: emoji,
              timestamp: new Date()
            }
          }
        }
      );
    } catch (error) {
      logger.error('Error adding message reaction:', error);
      throw error;
    }
  },

  /**
   * Remove reaction from message
   */
  async removeMessageReaction(userId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Message not found');
      }

      await Message.updateOne(
        { _id: messageId },
        {
          $pull: {
            reactions: {
              userId: userId,
              emoji: emoji
            }
          }
        }
      );
    } catch (error) {
      logger.error('Error removing message reaction:', error);
      throw error;
    }
  },

  /**
   * Update user presence
   */
  async updateUserPresence(
    userId: string, 
    status: UserPresenceStatus, 
    socketId?: string,
    deviceInfo?: any
  ): Promise<IUserPresence> {
    try {
      const presence = await UserPresence.findOneAndUpdate(
        { userId: userId },
        {
          status,
          lastSeen: new Date(),
          lastActivity: new Date(),
          socketId,
          deviceInfo
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      return presence;
    } catch (error) {
      logger.error('Error updating user presence:', error);
      throw error;
    }
  },

  /**
   * Set typing status
   */
  async setTypingStatus(userId: string, conversationId: string, isTyping: boolean): Promise<void> {
    try {
      // Skip if no valid conversationId provided
      if (!conversationId || conversationId.trim() === '') {
        return;
      }

      if (isTyping) {
        await UserPresence.updateOne(
          { userId: userId },
          {
            $addToSet: {
              isTyping: {
                conversationId: new mongoose.Types.ObjectId(conversationId),
                startedAt: new Date()
              }
            }
          }
        );
      } else {
        await UserPresence.updateOne(
          { userId: userId },
          {
            $pull: {
              isTyping: {
                conversationId: new mongoose.Types.ObjectId(conversationId)
              }
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error setting typing status:', error);
      throw error;
    }
  },

  /**
   * Get online users in user's organizations
   */
  async getOnlineUsers(userId: string): Promise<ConversationMemberInfo[]> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }

      let allowedUserIds: string[] = [];

      if (user.role === UserRole.ADMIN) {
        // Admin can see all online users
        const allUsers = await User.find({}, '_id');
        allowedUserIds = allUsers.map(u => u._id.toString());
      } else {
        // Get users from shared organizations
        const organizations = await Organization.find({
          $or: [
            { participantId: userId },
            { 'workers.workerId': userId }
          ]
        });

        const userIdsSet = new Set<string>();
        
        organizations.forEach(org => {
          userIdsSet.add(org.participantId.toString());
          org.workers.forEach(worker => {
            userIdsSet.add(worker.workerId.toString());
          });
        });

        allowedUserIds = Array.from(userIdsSet);
      }

      // Get presence information for allowed users
      const presenceData = await UserPresence.find({
        userId: { $in: allowedUserIds },
        status: { $ne: UserPresenceStatus.OFFLINE }
      }).populate({
        path: 'userId',
        select: 'firstName lastName profileImage role'
      });

      return presenceData.map(presence => ({
        userId: presence.userId._id.toString(),
        firstName: (presence.userId as any).firstName,
        lastName: (presence.userId as any).lastName,
        role: (presence.userId as any).role,
        profileImage: (presence.userId as any).profileImage,
        isOnline: presence.status === UserPresenceStatus.ONLINE,
        lastSeen: presence.lastSeen
      }));
    } catch (error) {
      logger.error('Error getting online users:', error);
      throw error;
    }
  },

  /**
   * Add members to group conversation
   */
  async addMembersToConversation(
    adderId: string, 
    conversationId: string, 
    memberIds: string[]
  ): Promise<IConversation> {
    try {
      // Check permissions
      const privacyCheck = await this.privacyValidator.canAddToGroupChat(adderId, conversationId, memberIds);
      
      if (!privacyCheck.canChat) {
        throw new ApiError(httpStatus.FORBIDDEN, privacyCheck.reason || 'Cannot add members');
      }

      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
      }

      // Filter out existing members
      const existingMemberIds = conversation.members.map(m => m.userId.toString());
      const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

      if (newMemberIds.length === 0) {
        return conversation;
      }

      // Add new members
      const newMembers = newMemberIds.map(memberId => ({
        userId: new mongoose.Types.ObjectId(memberId),
        joinedAt: new Date(),
        role: 'member' as const,
        notifications: true
      }));

      conversation.members.push(...newMembers);
      await conversation.save();

      return conversation;
    } catch (error) {
      logger.error('Error adding members to conversation:', error);
      throw error;
    }
  },

  /**
   * Remove member from conversation
   */
  async removeMemberFromConversation(
    removerId: string, 
    conversationId: string, 
    memberId: string
  ): Promise<IConversation> {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
      }

      // Check if remover is admin of conversation or admin user
      const remover = await User.findById(removerId);
      const removerMember = conversation.members.find(m => m.userId.toString() === removerId);
      
      if (!remover || !removerMember) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to remove members');
      }

      if (remover.role !== UserRole.ADMIN && removerMember.role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only conversation admins can remove members');
      }

      // Remove member
      conversation.members = conversation.members.filter(m => m.userId.toString() !== memberId);
      await conversation.save();

      return conversation;
    } catch (error) {
      logger.error('Error removing member from conversation:', error);
      throw error;
    }
  },

  /**
   * Search conversations and messages
   */
  async searchConversations(
    userId: string, 
    query: string, 
    limit: number = 20
  ): Promise<{
    conversations: IConversation[];
    messages: IMessage[];
  }> {
    try {
      // Get user's conversations
      const userConversations = await Conversation.find({
        'members.userId': userId,
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      })
      .populate('members.userId', 'firstName lastName profileImage role')
      .limit(limit);

      // Search messages in user's conversations
      const conversationIds = await Conversation.find({
        'members.userId': userId,
        isActive: true
      }).distinct('_id');

      const messages = await Message.find({
        conversationId: { $in: conversationIds },
        content: { $regex: query, $options: 'i' },
        deletedFor: { $ne: userId }
      })
      .populate('sender', 'firstName lastName profileImage')
      .populate('conversationId', 'name type')
      .sort({ createdAt: -1 })
      .limit(limit);

      return {
        conversations: userConversations,
        messages
      };
    } catch (error) {
      logger.error('Error searching conversations:', error);
      throw error;
    }
  }
};