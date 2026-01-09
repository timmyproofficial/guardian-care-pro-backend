/**
 * Type definitions for user-related entities
 * Includes enums and interfaces for different user roles and profiles
 */

/**
 * User role enumeration
 * Defines the different types of users in the system
 */
export enum UserRole {
    PARTICIPANT = 'participant',
    GUARDIAN = 'guardian',
    SUPPORT_WORKER = 'supportWorker',
    SUPPORT_COORDINATOR = 'supportCoordinator',
    ADMIN = 'admin',
    PROVIDER = 'provider'  // Enterprise providers (aged care, disability support agencies)
  }

// Admin types enumeration (sub-roles)
export enum AdminType {
  COORDINATOR = 'coordinator',
  SUPER_ADMIN = 'superAdmin',
  EDITOR = 'editor'
}
  
  /**
   * User status enumeration
   * Defines the possible status values for user accounts
   */
  export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    SUSPENDED = 'suspended'
  }
  
  /**
   * User gender enumeration
   * Used for profile information and matching preferences
   */
  export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    NON_BINARY = 'nonBinary',
    PREFER_NOT_TO_SAY = 'preferNotToSay'
  }
  
  /**
   * Contact information interface
   * Common structure for storing contact details
   */
  export interface ContactInfo {
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }
  
  /**
   * User registration input interface
   * Data required for user registration
   */
  export interface UserRegistrationInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone: string;
  }
  
  /**
   * Support worker skills/services enumeration
   * Types of services that support workers can offer
   */
  export enum SupportWorkerSkill {
    PERSONAL_CARE = 'personalCare',
    HOUSEHOLD_TASKS = 'householdTasks',
    SOCIAL_SUPPORT = 'socialSupport',
    TRANSPORT = 'transport',
    MEAL_PREPARATION = 'mealPreparation',
    MEDICATION_SUPPORT = 'medicationSupport',
    MOBILITY_ASSISTANCE = 'mobilityAssistance',
    THERAPY_SUPPORT = 'therapySupport',
    BEHAVIOR_SUPPORT = 'behaviorSupport',
    COMMUNITY_ACCESS = 'communityAccess'
  }
  
  /**
   * Compliance document type enumeration
   * Types of documents required for verification
   */
  export enum DocumentType {
    POLICE_CHECK = 'policeCheck',
    NDIS_WORKER_SCREENING = 'ndisWorkerScreening',
    WORKING_WITH_CHILDREN = 'workingWithChildren',
    FIRST_AID = 'firstAid',
    CPR = 'cpr',
    PROFESSIONAL_QUALIFICATION = 'professionalQualification',
    DRIVERS_LICENSE = 'driversLicense',
    IDENTIFICATION = 'identification',
    INSURANCE = 'insurance',
    OTHER = 'other'
  }
  
  /**
   * Compliance verification status enumeration
   * Status of document verification
   */
  export enum VerificationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EXPIRED = 'expired'
  }
  
  /**
   * Subscription tier enumeration
   * Pricing tiers for participants
   */
  export enum SubscriptionTier {
    BASIC = 'basic',     // $20/month with usage cap
    STANDARD = 'standard', // Intermediate tier
    PREMIUM = 'premium'  // $50/month unlimited
  }
  
  /**
   * Notification preference enumeration
   * User preferences for receiving notifications
   */
  export enum NotificationPreference {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
    EMAIL_AND_SMS = 'emailAndSms',
    EMAIL_AND_PUSH = 'emailAndPush',
    ALL = 'all',
    NONE = 'none'
  }