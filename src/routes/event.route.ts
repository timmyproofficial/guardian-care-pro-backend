/**
 * Event Routes
 * API endpoints for event operations
 */

import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { eventImageUpload } from '../utils/cloudinary';
import { UserRole } from '../types/user.types';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @swagger
 * /api/v1/events:
 *   get:
 *     summary: Get all events with filters
 *     description: Get all events with filters
 *     tags: [Events]
 *     security: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 */
router.get('/', eventController.getAllEvents);

/**
 * @swagger
 * /api/v1/events/:eventId:
 *   get:
 *     summary: Get a single event by ID
 *     description: Get a single event by ID
 *     tags: [Events]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The eventId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       404:
 *         description: Resource not found
 */
router.get('/:eventId', eventController.getEventById);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

/**
 * @swagger
 * /api/v1/events/user/my-events:
 *   get:
 *     summary: Get events created by the current user
 *     description: Get events created by the current user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/my-events',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.getMyEvents
);

/**
 * @swagger
 * /api/v1/events/user/my-registrations:
 *   get:
 *     summary: Get user's event registrations
 *     description: Get user's event registrations
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/user/my-registrations',
  authenticate,
  eventController.getMyRegistrations
);

/**
 * @swagger
 * /api/v1/events:
 *   post:
 *     summary: Create a new event (multipart/form-data with eventImage)
 *     description: Create a new event (multipart/form-data with eventImage)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventImageUpload.single('eventImage'),
  eventController.createEvent
);

/**
 * @swagger
 * /api/v1/events/:eventId:
 *   put:
 *     summary: Update an event (multipart/form-data with eventImage)
 *     description: Update an event (multipart/form-data with eventImage)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The eventId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.put(
  '/:eventId',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventImageUpload.single('eventImage'),
  eventController.updateEvent
);

/**
 * @swagger
 * /api/v1/events/:eventId:
 *   delete:
 *     summary: Soft delete an event
 *     description: Soft delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The eventId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
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
 * @swagger
 * /api/v1/events/:eventId/register:
 *   post:
 *     summary: Register for an event
 *     description: Register for an event
 *     tags: [Events]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The eventId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Successfully created
 *       404:
 *         description: Resource not found
 */
router.post(
  '/:eventId/register',
  eventController.registerForEvent
);

/**
 * @swagger
 * /api/v1/events/:eventId/registrations:
 *   get:
 *     summary: Get registrations for an event (event owner only)
 *     description: Get registrations for an event (event owner only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The eventId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/:eventId/registrations',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.getEventRegistrations
);

/**
 * @swagger
 * /api/v1/events/registrations/:registrationId:
 *   get:
 *     summary: Get a single registration
 *     description: Get a single registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The registrationId
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.get(
  '/registrations/:registrationId',
  authenticate,
  eventController.getRegistrationById
);

/**
 * @swagger
 * /api/v1/events/registrations/:registrationId/accept:
 *   patch:
 *     summary: Accept a registration
 *     description: Accept a registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The registrationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.patch(
  '/registrations/:registrationId/accept',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.acceptRegistration
);

/**
 * @swagger
 * /api/v1/events/registrations/:registrationId/reject:
 *   patch:
 *     summary: Reject a registration
 *     description: Reject a registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The registrationId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.patch(
  '/registrations/:registrationId/reject',
  authenticate,
  authorize([UserRole.PROVIDER, UserRole.ADMIN]),
  eventController.rejectRegistration
);

/**
 * @swagger
 * /api/v1/events/registrations/:registrationId:
 *   delete:
 *     summary: Delete a registration
 *     description: Delete a registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The registrationId
 *     responses:
 *       200:
 *         description: Successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
router.delete(
  '/registrations/:registrationId',
  authenticate,
  eventController.deleteRegistration
);

export default router;

