/**
 * Event Registration Service
 * Business logic for event registration operations
 */

import { Types, FilterQuery } from 'mongoose';
import httpStatus from 'http-status';
import EventRegistration, { IEventRegistrationDocument } from '../models/eventRegistration.model';
import Event from '../models/event.model';
import {
  EventRegistrationInput,
  RegistrationStatus,
  RegistrationFilterParams,
} from '../types/event.types';
import ApiError from '../utils/api-error';
import * as eventService from './event.service';

/**
 * Register for an event
 */
export async function registerForEvent(
  eventId: string | Types.ObjectId,
  input: EventRegistrationInput,
  userId?: Types.ObjectId
): Promise<IEventRegistrationDocument> {
  // Check if event exists and is published
  const event = await Event.findOne({
    _id: eventId,
    isDeleted: false,
    status: 'published',
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found or not accepting registrations');
  }

  // Check for duplicate registration by email
  const existingRegistration = await EventRegistration.findOne({
    eventId,
    email: input.email.toLowerCase(),
    isDeleted: false,
  });

  if (existingRegistration) {
    throw new ApiError(httpStatus.CONFLICT, 'You have already registered for this event');
  }

  // Create registration
  const registration = new EventRegistration({
    eventId,
    userId,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    location: input.location,
    reason: input.reason,
  });

  await registration.save();

  // Increment event registration count
  await eventService.incrementRegistrationCount(event._id as Types.ObjectId);

  return registration;
}

/**
 * Get registration by ID
 */
export async function getRegistrationById(
  registrationId: string | Types.ObjectId,
  includeDeleted: boolean = false
): Promise<IEventRegistrationDocument | null> {
  const query: FilterQuery<IEventRegistrationDocument> = { _id: registrationId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const registration = await EventRegistration.findOne(query)
    .populate({
      path: 'eventId',
      select: 'eventName eventStartDate eventEndDate eventLocation eventImage status',
    })
    .populate({
      path: 'userId',
      select: 'firstName lastName profileImage email',
    })
    .populate({
      path: 'reviewedBy',
      select: 'firstName lastName',
    });

  return registration;
}

/**
 * Get registrations for a specific event
 */
export async function getEventRegistrations(
  eventId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false,
  filters: RegistrationFilterParams = {}
): Promise<{
  registrations: IEventRegistrationDocument[];
  total: number;
  statusCounts: {
    all: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
}> {
  // Verify event ownership
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (!isAdmin && !event.createdBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view registrations for this event');
  }

  const { status, limit = 20, offset = 0 } = filters;

  const baseQuery: FilterQuery<IEventRegistrationDocument> = {
    eventId,
    isDeleted: false,
  };

  // Apply status filter if not 'all'
  const query = { ...baseQuery };
  if (status && status !== 'all') {
    query.status = status;
  }

  // Get registrations and counts in parallel
  const [registrations, total, pendingCount, acceptedCount, rejectedCount] = await Promise.all([
    EventRegistration.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'firstName lastName profileImage email',
      })
      .populate({
        path: 'reviewedBy',
        select: 'firstName lastName',
      }),
    EventRegistration.countDocuments(query),
    EventRegistration.countDocuments({ ...baseQuery, status: RegistrationStatus.PENDING }),
    EventRegistration.countDocuments({ ...baseQuery, status: RegistrationStatus.ACCEPTED }),
    EventRegistration.countDocuments({ ...baseQuery, status: RegistrationStatus.REJECTED }),
  ]);

  return {
    registrations,
    total,
    statusCounts: {
      all: pendingCount + acceptedCount + rejectedCount,
      pending: pendingCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
    },
  };
}

/**
 * Accept a registration
 */
export async function acceptRegistration(
  registrationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false
): Promise<IEventRegistrationDocument> {
  const registration = await EventRegistration.findOne({
    _id: registrationId,
    isDeleted: false,
  }).populate('eventId');

  if (!registration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Registration not found');
  }

  const event = registration.eventId as any;

  // Check if user owns the event
  if (!isAdmin && !event.createdBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to accept this registration');
  }

  // Check if already processed
  if (registration.status !== RegistrationStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Registration has already been ${registration.status}`
    );
  }

  registration.status = RegistrationStatus.ACCEPTED;
  registration.reviewedBy = userId;
  registration.reviewedAt = new Date();
  registration.rejectionReason = undefined;

  await registration.save();

  return registration;
}

/**
 * Reject a registration
 */
export async function rejectRegistration(
  registrationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  rejectionReason?: string,
  isAdmin: boolean = false
): Promise<IEventRegistrationDocument> {
  const registration = await EventRegistration.findOne({
    _id: registrationId,
    isDeleted: false,
  }).populate('eventId');

  if (!registration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Registration not found');
  }

  const event = registration.eventId as any;

  // Check if user owns the event
  if (!isAdmin && !event.createdBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to reject this registration');
  }

  // Check if already processed
  if (registration.status !== RegistrationStatus.PENDING) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Registration has already been ${registration.status}`
    );
  }

  registration.status = RegistrationStatus.REJECTED;
  registration.reviewedBy = userId;
  registration.reviewedAt = new Date();
  if (rejectionReason) {
    registration.rejectionReason = rejectionReason;
  }

  await registration.save();

  return registration;
}

/**
 * Get registrations by user
 */
export async function getRegistrationsByUser(
  userId: Types.ObjectId,
  limit: number = 20,
  offset: number = 0
): Promise<{
  registrations: IEventRegistrationDocument[];
  total: number;
}> {
  const query: FilterQuery<IEventRegistrationDocument> = {
    userId,
    isDeleted: false,
  };

  const [registrations, total] = await Promise.all([
    EventRegistration.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'eventId',
        select: 'eventName eventStartDate eventEndDate eventLocation eventImage status isDeleted',
      }),
    EventRegistration.countDocuments(query),
  ]);

  return { registrations, total };
}

/**
 * Delete a registration (soft delete)
 */
export async function deleteRegistration(
  registrationId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false
): Promise<IEventRegistrationDocument> {
  const registration = await EventRegistration.findOne({
    _id: registrationId,
    isDeleted: false,
  }).populate('eventId');

  if (!registration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Registration not found');
  }

  const event = registration.eventId as any;

  // Allow deletion by registrant or event owner
  const isRegistrant = registration.userId?.equals(userId);
  const isEventOwner = event.createdBy.equals(userId);

  if (!isAdmin && !isRegistrant && !isEventOwner) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this registration');
  }

  registration.isDeleted = true;
  registration.deletedAt = new Date();
  await registration.save();

  // Decrement event registration count
  await eventService.decrementRegistrationCount(event._id);

  return registration;
}

/**
 * Check if user has registered for an event
 */
export async function hasUserRegistered(
  eventId: string | Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> {
  const registration = await EventRegistration.findOne({
    eventId,
    userId,
    isDeleted: false,
  });

  return !!registration;
}

