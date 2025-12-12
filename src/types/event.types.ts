/**
 * Event Module Types
 * Types and interfaces for the Event module
 */

import { Types } from 'mongoose';

/**
 * Event Status Enum
 */
export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/**
 * Registration Status Enum
 */
export enum RegistrationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

/**
 * Event Interface
 */
export interface IEvent {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  eventImage?: string;
  eventName: string;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  eventStartDate: Date;
  eventEndDate: Date;
  eventDescr: string;
  status: EventStatus;
  registrationCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event Registration Interface
 */
export interface IEventRegistration {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId?: Types.ObjectId; // Optional - if user is logged in
  fullName: string;
  email: string;
  phone: string;
  location: string;
  reason: string;
  status: RegistrationStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Event Input
 */
export interface CreateEventInput {
  eventImage?: string;
  eventName: string;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  eventStartDate: Date;
  eventEndDate: Date;
  eventDescr: string;
  status?: EventStatus;
}

/**
 * Update Event Input
 */
export interface UpdateEventInput {
  eventImage?: string;
  eventName?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventLocation?: string;
  eventStartDate?: Date;
  eventEndDate?: Date;
  eventDescr?: string;
  status?: EventStatus;
}

/**
 * Event Registration Input
 */
export interface EventRegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  reason: string;
}

/**
 * Event Search/Filter Params
 */
export interface EventSearchParams {
  status?: EventStatus;
  createdBy?: Types.ObjectId;
  startDateFrom?: Date;
  startDateTo?: Date;
  location?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'eventStartDate' | 'registrationCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Registration Filter Params
 */
export interface RegistrationFilterParams {
  status?: RegistrationStatus | 'all';
  limit?: number;
  offset?: number;
}

/**
 * Event with Creator Info
 */
export interface EventWithCreator extends Omit<IEvent, 'createdBy'> {
  createdBy: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

