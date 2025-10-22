/**
 * User Presence model definition
 * Schema for tracking user online status and activity
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * User status enumeration
 */
export enum UserPresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

/**
 * Typing status interface
 */
export interface TypingStatus {
  conversationId: mongoose.Types.ObjectId;
  startedAt: Date;
}

/**
 * User presence document interface
 */
export interface IUserPresence extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: UserPresenceStatus;
  lastSeen: Date;
  lastActivity: Date;
  deviceInfo?: {
    platform: string;
    userAgent: string;
    ipAddress: string;
  };
  isTyping: TypingStatus[];
  customStatus?: string;
  socketId?: string; // Current socket connection ID
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User presence schema definition
 */
const userPresenceSchema = new Schema<IUserPresence>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: Object.values(UserPresenceStatus),
      default: UserPresenceStatus.OFFLINE
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    deviceInfo: {
      platform: String,
      userAgent: String,
      ipAddress: String
    },
    isTyping: [{
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
      },
      startedAt: {
        type: Date,
        default: Date.now
      }
    }],
    customStatus: {
      type: String,
      maxlength: 100
    },
    socketId: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

/**
 * Add indexes for faster queries
 * Note: 'userId' field already has unique: true in field definition, so no need for explicit index
 */
userPresenceSchema.index({ status: 1 });
userPresenceSchema.index({ lastSeen: -1 });
userPresenceSchema.index({ socketId: 1 });
userPresenceSchema.index({ 'isTyping.conversationId': 1 });

/**
 * Create and export the UserPresence model
 */
const UserPresence = mongoose.model<IUserPresence>('UserPresence', userPresenceSchema);

export default UserPresence;