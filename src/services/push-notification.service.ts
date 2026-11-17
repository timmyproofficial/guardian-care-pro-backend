/**
 * Push Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging (FCM)
 */

import admin from 'firebase-admin';
import logger from '../utils/logger';
import User from '../models/user.model';
import config from '../config/env';

/**
 * Push notification data interface
 */
interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  data?: Record<string, string>; // For deep linking and custom data
  priority?: 'high' | 'normal';
  sound?: string;
}

/**
 * Initialize Firebase Admin SDK
 */
let isFirebaseInitialized = false;

const initializeFirebase = (): void => {
  if (isFirebaseInitialized) return;

  try {
    if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
      logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
    });

    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error);
  }
};

/**
 * Push Notification Service
 */
export class PushNotificationService {
  /**
   * Send push notification to a specific user
   */
  static async sendToUser(
    userId: string,
    notification: PushNotificationData
  ): Promise<void> {
    try {
      // Initialize Firebase if not already done
      if (!isFirebaseInitialized) {
        initializeFirebase();
      }

      if (!isFirebaseInitialized) {
        logger.warn('Push notification skipped - Firebase not initialized');
        return;
      }

      // Get user and their push tokens
      const user = await User.findById(userId);
      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        logger.info(`No push tokens found for user ${userId}`);
        return;
      }

      // Filter active tokens
      const activeTokens = user.pushTokens
        .filter(t => t.token && t.token.length > 0)
        .map(t => t.token);

      if (activeTokens.length === 0) {
        logger.info(`No active push tokens for user ${userId}`);
        return;
      }

      // Prepare multicast message
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data || {},
        tokens: activeTokens,
        android: {
          priority: notification.priority || 'high',
          notification: {
            icon: notification.icon || 'ic_notification',
            color: '#0D2BEC', // Your brand color
            sound: notification.sound || 'default',
            channelId: 'guardian_care_pro_notifications',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge ? parseInt(notification.badge) : undefined,
              sound: notification.sound || 'default',
              contentAvailable: true,
            },
          },
          fcmOptions: {
            imageUrl: notification.image,
          },
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192x192.png',
            badge: notification.badge || '/badge-72x72.png',
            image: notification.image,
          },
        },
      };

      // Send to all devices
      const response = await admin.messaging().sendEachForMulticast(message);

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(activeTokens[idx]);
            const errorCode = resp.error?.code || 'unknown';
            logger.warn(`Failed to send push to token ${idx}: ${errorCode}`);
          }
        });

        // Remove invalid tokens from database
        if (failedTokens.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $pull: {
              pushTokens: { token: { $in: failedTokens } },
            },
          });
          logger.info(`Removed ${failedTokens.length} invalid push tokens for user ${userId}`);
        }
      }

      logger.info(
        `Push notification sent to user ${userId}: ${response.successCount}/${activeTokens.length} devices`
      );
    } catch (error) {
      logger.error(`Error sending push notification to user ${userId}:`, error);
      // Don't throw - push failures shouldn't break the main flow
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    notification: PushNotificationData
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendToUser(userId, notification).catch(error => {
        logger.error(`Failed to send push to user ${userId}:`, error);
      })
    );
    await Promise.allSettled(promises);
  }

  /**
   * Send push notification to users by role
   */
  static async sendToUsersByRole(
    role: string,
    notification: PushNotificationData
  ): Promise<void> {
    try {
      const users = await User.find({ 
        role,
        pushTokens: { $exists: true, $ne: [] }
      }).select('_id');
      
      const userIds = users.map(u => u._id.toString());
      await this.sendToMultipleUsers(userIds, notification);
      
      logger.info(`Broadcast push notification sent to ${userIds.length} users with role ${role}`);
    } catch (error) {
      logger.error(`Error sending broadcast push to role ${role}:`, error);
    }
  }

  /**
   * Register a device token
   */
  static async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceId: string
  ): Promise<void> {
    try {
      // First, remove the token if it exists (to avoid duplicates)
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushTokens: { token },
        },
      });

      // Then add it fresh
      await User.findByIdAndUpdate(userId, {
        $push: {
          pushTokens: {
            token,
            platform,
            deviceId,
            lastUsed: new Date(),
          },
        },
      });

      logger.info(`Push token registered for user ${userId} on ${platform} (device: ${deviceId})`);
    } catch (error) {
      logger.error(`Error registering push token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  static async unregisterToken(userId: string, token: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $pull: {
          pushTokens: { token },
        },
      });

      logger.info(`Push token unregistered for user ${userId}`);
    } catch (error) {
      logger.error(`Error unregistering push token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update token last used timestamp
   */
  static async updateTokenLastUsed(userId: string, token: string): Promise<void> {
    try {
      await User.findOneAndUpdate(
        { _id: userId, 'pushTokens.token': token },
        { $set: { 'pushTokens.$.lastUsed': new Date() } }
      );
    } catch (error) {
      logger.error(`Error updating token last used for user ${userId}:`, error);
    }
  }

  /**
   * Get user's push tokens
   */
  static async getUserTokens(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId).select('pushTokens');
      if (!user || !user.pushTokens) return [];
      
      return user.pushTokens
        .filter(t => t.token && t.token.length > 0)
        .map(t => t.token);
    } catch (error) {
      logger.error(`Error getting user tokens for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clean up old/inactive tokens (tokens not used in 90 days)
   */
  static async cleanupOldTokens(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await User.updateMany(
        {},
        {
          $pull: {
            pushTokens: {
              lastUsed: { $lt: ninetyDaysAgo },
            },
          },
        }
      );

      logger.info(`Cleaned up old push tokens: ${result.modifiedCount} users affected`);
    } catch (error) {
      logger.error('Error cleaning up old push tokens:', error);
    }
  }
}

// Initialize Firebase on module load
initializeFirebase();

