/**
 * Notification Controller
 * Handles push notification registration and preferences
 */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { PushNotificationService } from '../services/push-notification.service';
import logger from '../utils/logger';

/**
 * Register device for push notifications
 */
export const registerDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, platform, deviceId } = req.body;
    
    if (!req.user) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    
    const userId = req.user._id.toString();

    // Validate inputs
    if (!token || !platform || !deviceId) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Token, platform, and deviceId are required',
      });
      return;
    }

    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Platform must be one of: ios, android, web',
      });
      return;
    }

    await PushNotificationService.registerToken(
      userId,
      token,
      platform,
      deviceId
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Device registered for push notifications successfully',
      data: {
        userId,
        platform,
        deviceId,
      },
    });
  } catch (error) {
    logger.error('Error registering device for push notifications:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to register device for push notifications',
    });
  }
};

/**
 * Unregister device from push notifications
 */
export const unregisterDevice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!req.user) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    
    const userId = req.user._id.toString();

    // Validate input
    if (!token) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Token is required',
      });
      return;
    }

    await PushNotificationService.unregisterToken(userId, token);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Device unregistered from push notifications successfully',
    });
  } catch (error) {
    logger.error('Error unregistering device:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to unregister device',
    });
  }
};

/**
 * Get user's registered devices
 */
export const getRegisteredDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    
    const userId = req.user._id.toString();
    const tokens = await PushNotificationService.getUserTokens(userId);

    res.status(httpStatus.OK).json({
      success: true,
      data: {
        deviceCount: tokens.length,
        devices: tokens.map((token, index) => ({
          id: index + 1,
          token: token.substring(0, 20) + '...', // Truncate for security
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting registered devices:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get registered devices',
    });
  }
};

/**
 * Test push notification (for development/testing)
 */
export const testPushNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }
    
    const userId = req.user._id.toString();
    const { title, body } = req.body;

    await PushNotificationService.sendToUser(userId, {
      title: title || 'Test Notification',
      body: body || 'This is a test push notification from Support24',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Test push notification sent successfully',
    });
  } catch (error) {
    logger.error('Error sending test push notification:', error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to send test push notification',
    });
  }
};

