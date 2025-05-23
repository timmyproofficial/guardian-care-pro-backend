/**
 * Conversation model definition
 * Schema for chat conversations between users
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Conversation type enumeration
 */
export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group'
}

/**
 * Conversation member interface
 */
export interface ConversationMember {
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
  role: 'admin' | 'member';
  lastSeen?: Date;
  notifications: boolean;
}

/**
 * Conversation document interface
 */
export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  type: ConversationType;
  name?: string; // For group chats
  description?: string;
  avatar?: string;
  organizationId?: mongoose.Types.ObjectId; // Organization context for privacy
  members: ConversationMember[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  lastMessage?: {
    messageId: mongoose.Types.ObjectId;
    content: string;
    sender: mongoose.Types.ObjectId;
    timestamp: Date;
    messageType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Conversation schema definition
 */
const conversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: Object.values(ConversationType),
      required: true
    },
    name: {
      type: String,
      required: function(this: IConversation) {
        return this.type === ConversationType.GROUP;
      },
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      maxlength: 500
    },
    avatar: {
      type: String // URL to group avatar image
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },
    members: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      },
      lastSeen: {
        type: Date
      },
      notifications: {
        type: Boolean,
        default: true
      }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastMessage: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      },
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: Date,
      messageType: String
    }
  },
  {
    timestamps: true
  }
);

/**
 * Add indexes for faster queries
 */
conversationSchema.index({ 'members.userId': 1 });
conversationSchema.index({ organizationId: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ isActive: 1 });
conversationSchema.index({ updatedAt: -1 });

/**
 * Create and export the Conversation model
 */
const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;