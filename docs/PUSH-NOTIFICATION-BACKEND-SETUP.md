# 🚀 Push Notification Backend Setup Guide

Complete guide for setting up Firebase Cloud Messaging on the Support24 backend.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Firebase Admin SDK Setup](#firebase-admin-sdk-setup)
3. [Environment Configuration](#environment-configuration)
4. [API Endpoints](#api-endpoints)
5. [Integration Examples](#integration-examples)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

---

## 🎯 Overview

The push notification system uses **Firebase Cloud Messaging (FCM)** to send notifications to mobile devices. The backend:

- Registers/unregisters device tokens
- Sends push notifications alongside emails
- Handles token cleanup and validation
- Provides test endpoints for development

---

## 🔥 Firebase Admin SDK Setup

### 1. Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **Support24** project
3. Click the gear icon (⚙️) → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file (e.g., `support24-firebase-admin.json`)

### 2. Extract Required Credentials

From the downloaded JSON file, you need:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
}
```

### 3. Add to Environment Variables

**IMPORTANT:** Do NOT commit the Firebase JSON file to your repository!

Add these to your `.env` file:

```bash
# Firebase Admin SDK (for Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Note:** The private key must include `\n` for line breaks. Keep it in quotes.

---

## ⚙️ Environment Configuration

### Complete `.env` Template:

```bash
# =============================================================================
# ENVIRONMENT
# =============================================================================
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=*

# =============================================================================
# DATABASE
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/support24
MONGODB_URI_TEST=mongodb://localhost:27017/support24_test

# =============================================================================
# JWT AUTHENTICATION
# =============================================================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30

# =============================================================================
# EMAIL (SMTP)
# =============================================================================
EMAIL_FROM=noreply@support24.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# =============================================================================
# CLOUDINARY (Image Storage)
# =============================================================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# =============================================================================
# EMAIL ASSETS
# =============================================================================
EMAIL_BANNER=https://res.cloudinary.com/your-cloud/image/upload/v1/email-banner.png
EMAIL_BANNER_LOCAL=  # Optional: local path to email banner for base64 encoding
LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/v1/logo.png
LOGO_LOCAL=  # Optional: local path to logo for base64 encoding
USE_BASE64_IMAGES=true

# Social Media Links
FACEBOOK_ICON_URL=https://cdn-icons-png.flaticon.com/512/124/124010.png
INSTAGRAM_ICON_URL=https://cdn-icons-png.flaticon.com/512/2111/2111463.png
LINKEDIN_ICON_URL=https://cdn-icons-png.flaticon.com/512/174/174857.png
FACEBOOK_URL=https://facebook.com/support24
INSTAGRAM_URL=https://instagram.com/support24
LINKEDIN_URL=https://linkedin.com/company/support24

# =============================================================================
# FIREBASE ADMIN SDK (Push Notifications)
# =============================================================================
FIREBASE_PROJECT_ID=support24-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@support24-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0...\n-----END PRIVATE KEY-----\n"

# =============================================================================
# AWS S3 (Optional - for file storage)
# =============================================================================
AWS_BUCKET_NAME=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# =============================================================================
# STRIPE (Payment Processing)
# =============================================================================
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
```

---

## 📡 API Endpoints

### 1. Register Device Token

**Endpoint:** `POST /api/v1/notifications/register-device`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "token": "FCM_DEVICE_TOKEN_HERE",
  "platform": "ios",  // or "android" or "web"
  "deviceId": "unique-device-identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device registered for push notifications successfully",
  "data": {
    "userId": "user-id",
    "platform": "ios",
    "deviceId": "device-id"
  }
}
```

### 2. Unregister Device Token

**Endpoint:** `POST /api/v1/notifications/unregister-device`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device unregistered from push notifications successfully"
}
```

### 3. Get Registered Devices

**Endpoint:** `GET /api/v1/notifications/devices`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceCount": 2,
    "devices": [
      {
        "id": 1,
        "token": "fFDgR6jKTqeXHNzC..."
      },
      {
        "id": 2,
        "token": "bV3qN8pLWxrZMKyT..."
      }
    ]
  }
}
```

### 4. Send Test Notification

**Endpoint:** `POST /api/v1/notifications/test`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test push notification"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test push notification sent successfully"
}
```

---

## 🔌 Integration Examples

### Example 1: Sending Push When Creating a Shift

```typescript
// In shift.service.ts (already integrated)

import { NotificationService } from './notification.service';

// After creating a shift
await NotificationService.notifyWorkerOfNewShift(shift);

// This automatically sends both email AND push notification
```

### Example 2: Custom Push Notification

```typescript
import { PushNotificationService } from '../services/push-notification.service';

// Send to a single user
await PushNotificationService.sendToUser(userId, {
  title: 'Custom Notification',
  body: 'This is a custom notification',
  data: {
    type: 'custom',
    customField: 'value',
    screen: 'CustomScreen',
  },
  priority: 'high',
});

// Send to multiple users
await PushNotificationService.sendToMultipleUsers(
  [userId1, userId2, userId3],
  {
    title: 'Broadcast Notification',
    body: 'Message to multiple users',
    data: { type: 'broadcast' },
  }
);

// Send to all users with a specific role
await PushNotificationService.sendToUsersByRole('support_worker', {
  title: 'Important Update',
  body: 'All support workers should read this',
  data: { type: 'role_broadcast' },
});
```

### Example 3: Notification with Deep Link

```typescript
await PushNotificationService.sendToUser(userId, {
  title: 'New Shift Assignment',
  body: 'You have been assigned a new shift',
  data: {
    type: 'new_shift',
    shiftId: 'shift-123',
    screen: 'ShiftDetails', // Mobile app will navigate to this screen
  },
  image: 'https://example.com/shift-image.jpg', // Optional
  priority: 'high',
});
```

---

## 🧪 Testing

### 1. Using Postman/cURL

**Test Registration:**
```bash
curl -X POST http://localhost:5000/api/v1/notifications/register-device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "DEVICE_FCM_TOKEN",
    "platform": "android",
    "deviceId": "test-device-123"
  }'
```

**Test Send:**
```bash
curl -X POST http://localhost:5000/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "Testing push notifications"
  }'
```

### 2. Check Logs

Monitor your backend logs for:

```
Firebase Admin SDK initialized successfully
FCM token registered for user 123abc on android (device: device-xyz)
Push notification sent to user 123abc: 1/1 devices
```

### 3. Verify in Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Check **Messaging insights** to see notification delivery stats

---

## 🚀 Production Deployment

### 1. Security Checklist

- [ ] Firebase service account key is stored securely (not in code)
- [ ] Environment variables are properly set in production
- [ ] Private key is properly escaped in `.env`
- [ ] Firebase project has proper security rules
- [ ] API endpoints require authentication
- [ ] Rate limiting is configured

### 2. Environment Variables (Production)

For **Heroku**:
```bash
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

For **AWS/Azure/GCP**:
Use their respective secret management services:
- AWS: AWS Secrets Manager / Parameter Store
- Azure: Azure Key Vault
- GCP: Secret Manager

### 3. Monitoring & Logging

Add monitoring for:
- Failed push deliveries
- Invalid tokens
- Token registration failures
- Notification send success rates

Example with logging:
```typescript
logger.info('Push notification sent', {
  userId,
  successCount: response.successCount,
  failureCount: response.failureCount,
  totalDevices: tokens.length,
});
```

### 4. Database Cleanup

Run periodic cleanup for old/inactive tokens:

```typescript
// Add to your cron jobs (e.g., once a week)
import { PushNotificationService } from '../services/push-notification.service';

// Clean tokens not used in 90 days
await PushNotificationService.cleanupOldTokens();
```

---

## 📊 Notification Types Reference

Current notification types in the system:

| Type | Trigger | Recipients | Screen |
|------|---------|------------|--------|
| `new_shift` | Shift created | Worker | ShiftDetails |
| `shift_confirmed` | Worker confirms | Participant | ShiftDetails |
| `shift_declined` | Worker declines | Participant | ShiftDetails |
| `shift_completed` | Worker completes | Participant | ShiftDetails |
| `shift_cancelled` | User cancels | Worker/Participant | ShiftDetails |
| `timesheet_submitted` | Worker submits | Participant | TimesheetDetails |
| `timesheet_approved` | Participant approves | Worker | TimesheetDetails |
| `timesheet_rejected` | Participant rejects | Worker | TimesheetDetails |
| `invoice_sent` | Invoice sent | Participant | InvoiceDetails |

---

## ❓ FAQ

**Q: Do notifications work on iOS simulator?**
A: No, push notifications require a physical iOS device.

**Q: What happens if a user has multiple devices?**
A: The system sends notifications to all registered devices for that user.

**Q: How are expired/invalid tokens handled?**
A: Invalid tokens are automatically removed from the database when FCM returns an error.

**Q: Can I send notifications without email?**
A: Yes, use `PushNotificationService.sendToUser()` directly instead of `NotificationService`.

**Q: How do I customize notification sounds?**
A: Configure custom sounds in the mobile app's push notification setup.

---

## 🎉 You're Ready!

Your backend is now configured to send push notifications!

For mobile integration, see: [FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md](./FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md)

---

**Need Help?** Check the troubleshooting section or contact the development team.

