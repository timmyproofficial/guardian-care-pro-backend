/**
 * Notification Routes
 * API endpoints for push notification management
 */

import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @route   POST /api/notifications/register-device
 * @desc    Register a device for push notifications
 * @access  Private (requires authentication)
 */
router.post('/register-device', authenticate, notificationController.registerDevice);

/**
 * @route   POST /api/notifications/unregister-device
 * @desc    Unregister a device from push notifications
 * @access  Private (requires authentication)
 */
router.post('/unregister-device', authenticate, notificationController.unregisterDevice);

/**
 * @route   GET /api/notifications/devices
 * @desc    Get user's registered devices
 * @access  Private (requires authentication)
 */
router.get('/devices', authenticate, notificationController.getRegisteredDevices);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test push notification (for development)
 * @access  Private (requires authentication)
 */
router.post('/test', authenticate, notificationController.testPushNotification);

export default router;

