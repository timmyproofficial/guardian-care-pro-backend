/**
 * Message model definition
 * Schema for individual messages in conversations
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Message type enumeration
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  AUDIO = 'audio',
  VIDEO = 'video',
  SYSTEM = 'system'
}

/**
 * Message status enumeration
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * File attachment interface
 */
export interface FileAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnail?: string; // For images/videos
}

/**
 * Message reaction interface
 */
export interface MessageReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
  timestamp: Date;
}

/**
 * Message read receipt interface
 */
export interface ReadReceipt {
  userId: mongoose.Types.ObjectId;
  readAt: Date;
}

/**
 * Message document interface
 */
export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: MessageType;
  content?: string;
  attachments: FileAttachment[];
  replyTo?: mongoose.Types.ObjectId; // Reference to another message
  mentions: mongoose.Types.ObjectId[]; // Users mentioned in the message
  reactions: MessageReaction[];
  readReceipts: ReadReceipt[];
  status: MessageStatus;
  editedAt?: Date;
  deletedAt?: Date;
  deletedFor: mongoose.Types.ObjectId[]; // Users who deleted this message
  metadata?: Record<string, any>; // For system messages or additional data
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message schema definition
 */
const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT
    },
    content: {
      type: String,
      required: function(this: IMessage) {
        return this.type === MessageType.TEXT && !this.attachments?.length;
      },
      maxlength: 4000
    },
    attachments: [{
      url: {
        type: String,
        required: true
      },
      filename: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true
      },
      mimeType: {
        type: String,
        required: true
      },
      thumbnail: String
    }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      emoji: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    readReceipts: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT
    },
    editedAt: {
      type: Date
    },
    deletedAt: {
      type: Date
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

/**
 * Add indexes for faster queries
 */
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readReceipts.userId': 1 });
messageSchema.index({ mentions: 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ status: 1 });

/**
 * Create and export the Message model
 */
const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;