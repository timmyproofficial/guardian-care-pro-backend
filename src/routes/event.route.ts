/**
 * Event Routes
 * API endpoints for event operations
 */

import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @route   GET /api/events
 * @desc    Get all events with filters
 * @access  Public
 */
router.get('/', eventController.getAllEvents);

/**
 * @route   GET /api/events/:eventId
 * @desc    Get a single event by ID
 * @access  Public (but extra info if authenticated)
 */
router.get('/:eventId', eventController.getEventById);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * @route   GET /api/events/user/my-events
 * @desc    Get events created by the current user
 * @access  Private (Provider, Admin)
 */
router.get(
  '/user/my-events',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.getMyEvents
);

/**
 * @route   GET /api/events/user/my-registrations
 * @desc    Get user's event registrations
 * @access  Private
 */
router.get(
  '/user/my-registrations',
  authenticate,
  eventController.getMyRegistrations
);

/**
 * @route   POST /api/events
 * @desc    Create a new event
 * @access  Private (Provider only)
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.createEvent
);

/**
 * @route   PUT /api/events/:eventId
 * @desc    Update an event
 * @access  Private (Owner or Admin)
 */
router.put(
  '/:eventId',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.updateEvent
);

/**
 * @route   DELETE /api/events/:eventId
 * @desc    Soft delete an event
 * @access  Private (Owner or Admin)
 */
router.delete(
  '/:eventId',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.deleteEvent
);

// =============================================================================
// EVENT REGISTRATION ROUTES
// =============================================================================

/**
 * @route   POST /api/events/:eventId/register
 * @desc    Register for an event
 * @access  Public (tracks userId if authenticated)
 */
router.post(
  '/:eventId/register',
  eventController.registerForEvent
);

/**
 * @route   GET /api/events/:eventId/registrations
 * @desc    Get registrations for an event (event owner only)
 * @access  Private (Event owner or Admin)
 */
router.get(
  '/:eventId/registrations',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.getEventRegistrations
);

/**
 * @route   GET /api/events/registrations/:registrationId
 * @desc    Get a single registration
 * @access  Private
 */
router.get(
  '/registrations/:registrationId',
  authenticate,
  eventController.getRegistrationById
);

/**
 * @route   PATCH /api/events/registrations/:registrationId/accept
 * @desc    Accept a registration
 * @access  Private (Event owner or Admin)
 */
router.patch(
  '/registrations/:registrationId/accept',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.acceptRegistration
);

/**
 * @route   PATCH /api/events/registrations/:registrationId/reject
 * @desc    Reject a registration
 * @access  Private (Event owner or Admin)
 */
router.patch(
  '/registrations/:registrationId/reject',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.rejectRegistration
);

/**
 * @route   DELETE /api/events/registrations/:registrationId
 * @desc    Delete a registration
 * @access  Private (Registrant, Event owner, or Admin)
 */
router.delete(
  '/registrations/:registrationId',
  authenticate,
  eventController.deleteRegistration
);

export default router;

