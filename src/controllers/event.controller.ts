/**
 * Event Controller
 * HTTP request handlers for event operations
 */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import * as eventService from '../services/event.service';
import * as eventRegistrationService from '../services/eventRegistration.service';
import {
  CreateEventInput,
  UpdateEventInput,
  EventSearchParams,
  EventRegistrationInput,
  EventStatus,
  RegistrationStatus,
  RegistrationFilterParams,
} from '../types/event.types';
import { UserRole } from '../types/user.types';
import ApiError from '../utils/api-error';
import catchAsync from '../utils/catchAsync';

// =============================================================================
// EVENT CRUD OPERATIONS
// =============================================================================

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const userRole = req.user!.role;

  // Only providers can create events
  if (userRole !== UserRole.PROVIDER && userRole !== UserRole.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only providers can create events');
  }

  const input: CreateEventInput = {
    eventImage: req.body.eventImage,
    eventName: req.body.eventName,
    eventStartTime: req.body.eventStartTime,
    eventEndTime: req.body.eventEndTime,
    eventLocation: req.body.eventLocation,
    eventStartDate: req.body.eventStartDate,
    eventEndDate: req.body.eventEndDate,
    eventDescr: req.body.eventDescr,
    status: req.body.status || EventStatus.PUBLISHED,
  };

  const event = await eventService.createEvent(userId, input);

  // Populate creator info before responding
  await event.populate({
    path: 'createdBy',
    select: 'firstName lastName profileImage',
  });

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Event created successfully',
    data: { event },
  });
});

/**
 * Get all events with filters
 * GET /api/events
 */
export const getAllEvents = catchAsync(async (req: Request, res: Response) => {
  const params: EventSearchParams = {
    status: (req.query.status as EventStatus) || EventStatus.PUBLISHED,
    location: req.query.location as string,
    startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom as string) : undefined,
    startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo as string) : undefined,
    search: req.query.search as string,
    limit: Math.min(Number(req.query.limit) || 20, 100),
    offset: Number(req.query.offset) || 0,
    sortBy: (req.query.sortBy as 'createdAt' | 'eventStartDate' | 'registrationCount') || 'eventStartDate',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
  };

  const result = await eventService.getAllEvents(params);

  res.status(httpStatus.OK).json({
    success: true,
    data: result,
  });
});

/**
 * Get a single event by ID
 * GET /api/events/:eventId
 */
export const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const event = await eventService.getEventById(eventId);

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check if user has registered for this event (if authenticated)
  let hasRegistered = false;
  if (req.user) {
    hasRegistered = await eventRegistrationService.hasUserRegistered(eventId, req.user._id);
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      event,
      hasRegistered,
    },
  });
});

/**
 * Get events created by the current user
 * GET /api/events/my-events
 */
export const getMyEvents = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const includeDeleted = req.query.includeDeleted === 'true';

  const result = await eventService.getEventsByUser(userId, includeDeleted, limit, offset);

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      events: result.events,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.events.length < result.total,
      },
    },
  });
});

/**
 * Update an event
 * PUT /api/events/:eventId
 */
export const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  const input: UpdateEventInput = {
    eventImage: req.body.eventImage,
    eventName: req.body.eventName,
    eventStartTime: req.body.eventStartTime,
    eventEndTime: req.body.eventEndTime,
    eventLocation: req.body.eventLocation,
    eventStartDate: req.body.eventStartDate,
    eventEndDate: req.body.eventEndDate,
    eventDescr: req.body.eventDescr,
    status: req.body.status,
  };

  // Remove undefined values
  Object.keys(input).forEach((key) => {
    if (input[key as keyof UpdateEventInput] === undefined) {
      delete input[key as keyof UpdateEventInput];
    }
  });

  const event = await eventService.updateEvent(eventId, userId, input, isAdmin);

  await event.populate({
    path: 'createdBy',
    select: 'firstName lastName profileImage',
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Event updated successfully',
    data: { event },
  });
});

/**
 * Soft delete an event
 * DELETE /api/events/:eventId
 */
export const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  await eventService.deleteEvent(eventId, userId, isAdmin);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Event deleted successfully',
  });
});

// =============================================================================
// EVENT REGISTRATION OPERATIONS
// =============================================================================

/**
 * Register for an event
 * POST /api/events/:eventId/register
 */
export const registerForEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?._id;

  const input: EventRegistrationInput = {
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    location: req.body.location,
    reason: req.body.reason,
  };

  const registration = await eventRegistrationService.registerForEvent(eventId, input, userId);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Successfully registered for the event',
    data: { registration },
  });
});

/**
 * Get registrations for an event (event owner only)
 * GET /api/events/:eventId/registrations
 */
export const getEventRegistrations = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  const filters: RegistrationFilterParams = {
    status: (req.query.status as RegistrationStatus | 'all') || 'all',
    limit: Math.min(Number(req.query.limit) || 20, 100),
    offset: Number(req.query.offset) || 0,
  };

  const result = await eventRegistrationService.getEventRegistrations(
    eventId,
    userId,
    isAdmin,
    filters
  );

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      registrations: result.registrations,
      total: result.total,
      statusCounts: result.statusCounts,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: (filters.offset || 0) + result.registrations.length < result.total,
      },
    },
  });
});

/**
 * Get user's event registrations
 * GET /api/events/my-registrations
 */
export const getMyRegistrations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const result = await eventRegistrationService.getRegistrationsByUser(userId, limit, offset);

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      registrations: result.registrations,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.registrations.length < result.total,
      },
    },
  });
});

/**
 * Get a single registration
 * GET /api/events/registrations/:registrationId
 */
export const getRegistrationById = catchAsync(async (req: Request, res: Response) => {
  const { registrationId } = req.params;

  const registration = await eventRegistrationService.getRegistrationById(registrationId);

  if (!registration) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Registration not found');
  }

  res.status(httpStatus.OK).json({
    success: true,
    data: { registration },
  });
});

/**
 * Accept a registration
 * PATCH /api/events/registrations/:registrationId/accept
 */
export const acceptRegistration = catchAsync(async (req: Request, res: Response) => {
  const { registrationId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  const registration = await eventRegistrationService.acceptRegistration(
    registrationId,
    userId,
    isAdmin
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Registration accepted successfully',
    data: { registration },
  });
});

/**
 * Reject a registration
 * PATCH /api/events/registrations/:registrationId/reject
 */
export const rejectRegistration = catchAsync(async (req: Request, res: Response) => {
  const { registrationId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;
  const { rejectionReason } = req.body;

  const registration = await eventRegistrationService.rejectRegistration(
    registrationId,
    userId,
    rejectionReason,
    isAdmin
  );

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Registration rejected successfully',
    data: { registration },
  });
});

/**
 * Delete a registration
 * DELETE /api/events/registrations/:registrationId
 */
export const deleteRegistration = catchAsync(async (req: Request, res: Response) => {
  const { registrationId } = req.params;
  const userId = req.user!._id;
  const isAdmin = req.user!.role === UserRole.ADMIN;

  await eventRegistrationService.deleteRegistration(registrationId, userId, isAdmin);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Registration deleted successfully',
  });
});

