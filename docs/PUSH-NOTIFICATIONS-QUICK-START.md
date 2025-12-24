# 🚀 Push Notifications - Quick Start Guide

Get push notifications working in **under 10 minutes**!

---

## 📋 Prerequisites

- Backend API running
- Firebase project created
- Mobile app (Flutter) set up

---

## ⚡ Backend Setup (5 minutes)

### Step 1: Get Firebase Credentials

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your **Support24** project
3. Click ⚙️ (Settings) → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Save the JSON file (e.g., `support24-firebase-key.json`)

### Step 2: Extract & Add to .env

Open the downloaded JSON file and extract these values:

```json
{
  "project_id": "support24-xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@support24-xxxxx.iam.gserviceaccount.com"
}
```

Add to your `.env` file:

```bash
# Firebase Push Notifications
FIREBASE_PROJECT_ID=support24-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@support24-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

⚠️ **Important:** Keep the quotes and `\n` characters in the private key!

### Step 3: Restart Server

```bash
npm run dev
```

Check logs for:
```
✅ Firebase Admin SDK initialized successfully
```

### Step 4: Test It

```bash
# Register a test token (replace with actual values)
curl -X POST http://localhost:5000/api/v1/v1/notifications/register-device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "test-fcm-token-here",
    "platform": "android",
    "deviceId": "test-device-123"
  }'

# Send a test notification
curl -X POST http://localhost:5000/api/v1/v1/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "It works! 🎉"
  }'
```

**Backend done! ✅**

---

## 📱 Flutter Setup (10 minutes)

### Step 1: Add Dependencies

In `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^16.3.0
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
```

Run:
```bash
flutter pub get
```

### Step 2: Add Firebase Config Files

**Android:** Download `google-services.json`
- Place in: `android/app/google-services.json`

**iOS:** Download `GoogleService-Info.plist`
- Place in: `ios/Runner/GoogleService-Info.plist`

### Step 3: Configure Android

**`android/app/build.gradle`:**
```gradle
apply plugin: 'com.google.gms.google-services'  // Add this line at the bottom

android {
    defaultConfig {
        minSdkVersion 21  // Required for FCM
    }
}
```

**`android/build.gradle`:**
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### Step 4: Configure iOS

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select target → **Signing & Capabilities**
3. Add **Push Notifications** capability
4. Add **Background Modes** capability (check "Remote notifications")

### Step 5: Copy NotificationService

Copy the complete `NotificationService` code from:
[`docs/FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md`](./FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md#2-notification-service-libservicesnotification_servicedart)

Save as: `lib/services/notification_service.dart`

**Update the API URL:**
```dart
static const String _baseUrl = 'https://your-api-url.com/api/v1/v1';
// or for local testing:
// static const String _baseUrl = 'http://10.0.2.2:5000/api/v1/v1'; // Android emulator
// static const String _baseUrl = 'http://localhost:5000/api/v1/v1'; // iOS simulator
```

### Step 6: Initialize in main.dart

```dart
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  await NotificationService.initialize();
  
  runApp(const MyApp());
}
```

### Step 7: Register Token After Login

In your `AuthService` or login function:

```dart
// After successful login
await NotificationService.getAndRegisterToken();
```

### Step 8: Test on Physical Device

1. **Build and install** the app on a physical device
2. **Login** to the app
3. Check logs for: `FCM Token registered successfully with backend`
4. **Trigger a notification** from backend (e.g., create a shift)
5. **Verify** notification appears on device

**Mobile done! ✅**

---

## ✅ Verification Checklist

### Backend
- [x] Firebase credentials added to `.env`
- [x] Server restarted
- [x] "Firebase Admin SDK initialized" in logs
- [x] Test endpoint returns success

### Mobile
- [x] Firebase dependencies added
- [x] Config files added (google-services.json / GoogleService-Info.plist)
- [x] Android & iOS configuration complete
- [x] NotificationService implemented
- [x] Token registration on login
- [x] Tested on physical device

---

## 🎯 What's Next?

### Test the Full Flow

1. **Login** on mobile app
2. **Create a shift** (assigns to a worker)
3. **Check** if notification appears on worker's device
4. **Tap notification** - should navigate to shift details

### Common Test Scenarios

| Action | Who Gets Notified | What They See |
|--------|-------------------|---------------|
| Create shift | Worker | "🔔 New Shift Assignment" |
| Worker confirms | Participant | "✅ Shift Confirmed" |
| Submit timesheet | Participant | "📋 New Timesheet for Review" |

### Add More Notifications

To add push notifications to other events:

1. Open `src/services/notification.service.ts`
2. Find the notification method (e.g., `notifyParticipantOfShiftCancellation`)
3. Add this code before the closing `}`

```typescript
// Send push notification
await PushNotificationService.sendToUser(participant._id.toString(), {
  title: '❌ Shift Cancelled',
  body: `Your shift on ${date} has been cancelled`,
  data: {
    type: 'shift_cancelled',
    shiftId: shift.shiftId,
    screen: 'ShiftDetails',
  },
  priority: 'high',
});
```

---

## 🐛 Troubleshooting

### "Firebase not initialized"
- Check `.env` file has all 3 Firebase variables
- Verify private key includes `\n` for line breaks
- Restart server

### "No FCM token found"
- User hasn't logged in on mobile
- Check mobile app logs for token generation
- Verify `NotificationService.initialize()` is called

### Notifications not appearing
- Use **physical device** (not emulator)
- Check device notification permissions
- Verify app is in foreground/background
- Check Firebase Console for delivery status

### "Failed to register token"
- Check API URL in Flutter code
- Verify auth token is valid
- Check network connectivity
- Review backend logs

---

## 📚 Full Documentation

For detailed information, see:

- **Backend Setup:** [`PUSH-NOTIFICATION-BACKEND-SETUP.md`](./PUSH-NOTIFICATION-BACKEND-SETUP.md)
- **Flutter Integration:** [`FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md`](./FLUTTER-PUSH-NOTIFICATION-INTEGRATION.md)
- **Complete Summary:** [`PUSH-NOTIFICATION-IMPLEMENTATION-SUMMARY.md`](./PUSH-NOTIFICATION-IMPLEMENTATION-SUMMARY.md)

---

## 🎉 You're Done!

Push notifications are now working! Users will receive real-time updates for important events.

**Happy coding! 🚀**

