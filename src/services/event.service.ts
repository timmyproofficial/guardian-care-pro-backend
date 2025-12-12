/**
 * Event Service
 * Business logic for event operations (CRUD)
 */

import { Types, FilterQuery } from 'mongoose';
import httpStatus from 'http-status';
import Event, { IEventDocument } from '../models/event.model';
import {
  CreateEventInput,
  UpdateEventInput,
  EventSearchParams,
  EventStatus,
  EventWithCreator,
} from '../types/event.types';
import ApiError from '../utils/api-error';

/**
 * Create a new event
 */
export async function createEvent(
  userId: Types.ObjectId,
  input: CreateEventInput
): Promise<IEventDocument> {
  const event = new Event({
    createdBy: userId,
    ...input,
  });

  await event.save();
  return event;
}

/**
 * Get event by ID
 */
export async function getEventById(
  eventId: string | Types.ObjectId,
  includeDeleted: boolean = false
): Promise<IEventDocument | null> {
  const query: FilterQuery<IEventDocument> = { _id: eventId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const event = await Event.findOne(query).populate({
    path: 'createdBy',
    select: 'firstName lastName profileImage',
  });

  return event;
}

/**
 * Get all events with filters and pagination
 */
export async function getAllEvents(params: EventSearchParams): Promise<{
  events: EventWithCreator[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const {
    status,
    createdBy,
    startDateFrom,
    startDateTo,
    location,
    search,
    limit = 20,
    offset = 0,
    sortBy = 'eventStartDate',
    sortOrder = 'asc',
  } = params;

  // Build query
  const query: FilterQuery<IEventDocument> = {
    isDeleted: false,
  };

  if (status) query.status = status;
  if (createdBy) query.createdBy = createdBy;
  if (location) query.eventLocation = { $regex: location, $options: 'i' };

  // Date range filter
  if (startDateFrom || startDateTo) {
    query.eventStartDate = {};
    if (startDateFrom) query.eventStartDate.$gte = startDateFrom;
    if (startDateTo) query.eventStartDate.$lte = startDateTo;
  }

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Sort options
  const sortOptions: Record<string, 1 | -1> = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query
  const [events, total] = await Promise.all([
    Event.find(query)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName profileImage',
      })
      .sort(sortOptions)
      .skip(offset)
      .limit(limit)
      .lean(),
    Event.countDocuments(query),
  ]);

  return {
    events: events as unknown as EventWithCreator[],
    total,
    pagination: {
      limit,
      offset,
      hasMore: offset + events.length < total,
    },
  };
}

/**
 * Get events created by a specific user
 */
export async function getEventsByUser(
  userId: Types.ObjectId,
  includeDeleted: boolean = false,
  limit: number = 20,
  offset: number = 0
): Promise<{
  events: IEventDocument[];
  total: number;
}> {
  const query: FilterQuery<IEventDocument> = {
    createdBy: userId,
  };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const [events, total] = await Promise.all([
    Event.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName profileImage',
      }),
    Event.countDocuments(query),
  ]);

  return { events, total };
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string | Types.ObjectId,
  userId: Types.ObjectId,
  input: UpdateEventInput,
  isAdmin: boolean = false
): Promise<IEventDocument> {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check ownership (unless admin)
  if (!isAdmin && !event.createdBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this event');
  }

  // Update fields
  if (input.eventImage !== undefined) event.eventImage = input.eventImage;
  if (input.eventName !== undefined) event.eventName = input.eventName;
  if (input.eventStartTime !== undefined) event.eventStartTime = input.eventStartTime;
  if (input.eventEndTime !== undefined) event.eventEndTime = input.eventEndTime;
  if (input.eventLocation !== undefined) event.eventLocation = input.eventLocation;
  if (input.eventStartDate !== undefined) event.eventStartDate = input.eventStartDate;
  if (input.eventEndDate !== undefined) event.eventEndDate = input.eventEndDate;
  if (input.eventDescr !== undefined) event.eventDescr = input.eventDescr;
  if (input.status !== undefined) event.status = input.status;

  await event.save();
  return event;
}

/**
 * Soft delete an event
 */
export async function deleteEvent(
  eventId: string | Types.ObjectId,
  userId: Types.ObjectId,
  isAdmin: boolean = false
): Promise<IEventDocument> {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check ownership (unless admin)
  if (!isAdmin && !event.createdBy.equals(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this event');
  }

  event.isDeleted = true;
  event.deletedAt = new Date();
  event.status = EventStatus.CANCELLED;

  await event.save();
  return event;
}

/**
 * Increment registration count for an event
 */
export async function incrementRegistrationCount(eventId: string | Types.ObjectId): Promise<void> {
  await Event.updateOne({ _id: eventId }, { $inc: { registrationCount: 1 } });
}

/**
 * Decrement registration count for an event
 */
export async function decrementRegistrationCount(eventId: string | Types.ObjectId): Promise<void> {
  await Event.updateOne(
    { _id: eventId, registrationCount: { $gt: 0 } },
    { $inc: { registrationCount: -1 } }
  );
}

