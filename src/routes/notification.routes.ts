/**
 * Notification Routes
 * API endpoints for push notification management
 */

import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @swagger
 * /api/v1/notifications/register-device:
 *   post:
 *     summary: Register a device for push notifications
 *     description: Register a device for push notifications
 *     tags: [Notifications]
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
router.post('/register-device', authenticate, notificationController.registerDevice);

/**
 * @swagger
 * /api/v1/notifications/unregister-device:
 *   post:
 *     summary: Unregister a device from push notifications
 *     description: Unregister a device from push notifications
 *     tags: [Notifications]
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
router.post('/unregister-device', authenticate, notificationController.unregisterDevice);

/**
 * @swagger
 * /api/v1/notifications/devices:
 *   get:
 *     summary: Get user's registered devices
 *     description: Get user's registered devices
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved data
 *       401:
 *         description: Unauthorized
 */
router.get('/devices', authenticate, notificationController.getRegisteredDevices);

/**
 * @swagger
 * /api/v1/notifications/test:
 *   post:
 *     summary: Send a test push notification (for development)
 *     description: Send a test push notification (for development)
 *     tags: [Notifications]
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
router.post('/test', authenticate, notificationController.testPushNotification);

export default router;

