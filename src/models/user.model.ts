/**
 * User model definition
 * Base schema for all user types in the system
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { UserRole, UserStatus, Gender, NotificationPreference } from '../types/user.types';

/**
 * User document interface
 * Extends the base Document type with user properties
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  profileImage?: string;
  bio?: string;
  notificationPreferences: NotificationPreference;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isPasswordMatch(password: string): Promise<boolean>;
}

/**
 * User model interface
 * Extends the base Model with static methods
 */
export interface IUserModel extends Model<IUser> {
  isEmailTaken(email: string, excludeUserId?: mongoose.Types.ObjectId): Promise<boolean>;
}

/**
 * User schema definition
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: 'Please provide a valid email',
      }
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (value: string) => validator.isMobilePhone(value),
        message: 'Phone number must be valid',
      },
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    profileImage: {
      type: String, // URL to profile image
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    notificationPreferences: {
      type: String,
      enum: Object.values(NotificationPreference),
      default: NotificationPreference.EMAIL,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    discriminatorKey: 'role', // Used for different user types
  }
);

/**
 * Add indexes for faster queries
 */
// userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

/**
 * Hash the password before saving
 */
userSchema.pre('save', async function (this: IUser, next) {
  // const user = this;
  
  if (this.isModified('password')) {
    // Hash password with bcrypt
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  next();
});

/**
 * Check if email is already in use
 */
userSchema.statics.isEmailTaken = async function (
  email: string, 
  excludeUserId?: mongoose.Types.ObjectId
): Promise<boolean> {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Password comparison method
 */
userSchema.methods.isPasswordMatch = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

/**
 * Transform returned JSON to remove sensitive fields
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  return user;
};

/**
 * Create and export the User model
 */
const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;