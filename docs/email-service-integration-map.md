# Email Service Integration Map

This document provides a comprehensive overview of all email service methods and where they are being called in the application.

## ✅ Email Methods Currently Integrated

### 1. **Authentication Emails**

#### `sendVerificationOTP(to, name, otpCode)`
- **Called In:** `src/services/auth.service.ts`
- **Functions:**
  - `register()` - Line 330: Sends OTP when user registers
  - `resendVerificationOTP()` - Line 177: Resends OTP when requested
- **Status:** ✅ **ACTIVE**

#### `sendPasswordResetOTP(to, name, otpCode)`
- **Called In:** `src/services/auth.service.ts`  
- **Functions:**
  - `forgotPassword()` - Used when user requests password reset
- **Status:** ✅ **ACTIVE**

---

### 2. **Shift-Related Emails**

#### `sendShiftBookingEmail(to, name, shiftDetails)`
- **Called In:** `src/services/notification.service.ts`
- **Functions:**
  - `notifyWorkerOfNewShift()` - Line 78: Sends email when worker is assigned to a shift
- **Triggered From:** `src/services/shift.service.ts`
  - `createShift()` - Lines 351-355, 378-383, 458-464, 521-523, 546-548, 623-627
- **Status:** ✅ **NOW ACTIVE** (Previously just logging)

---

### 3. **Timesheet-Related Emails**

#### `sendTimesheetApprovalEmail(to, name, timesheetDetails)`
- **Called In:** `src/services/notification.service.ts`
- **Functions:**
  - `notifyWorkerOfTimesheetApproval()` - Line 356: Sends email when timesheet is approved
  - `notifyWorkerOfTimesheetRejection()` - Line 390: Sends email when timesheet is rejected
- **Triggered From:** `src/services/timesheet.service.ts`
  - `updateTimesheetStatus()` - Lines 570, 596: When participant approves/rejects timesheet
- **Status:** ✅ **NOW ACTIVE** (Previously just logging)

---

### 4. **Invoice-Related Emails**

#### `sendInvoiceEmail(to, name, invoiceDetails)`
- **Called In:** `src/services/invoice.service.ts`
- **Functions:**
  - `sendInvoiceToParticipant()` - Line 393: Sends invoice to participant
- **Status:** ✅ **ACTIVE**

#### `sendBatchInvoiceEmail(to, name, invoiceDetails)`
- **Called In:** `src/services/batchInvoice.service.ts`
- **Functions:**
  - `sendBatchInvoiceEmail()` - Line 851: Sends weekly batch invoice to participant
- **Status:** ✅ **ACTIVE**

#### `sendWorkerBatchInvoiceEmail(to, name, invoiceDetails)`
- **Called In:** `src/services/batchInvoice.service.ts`
- **Functions:**
  - `sendBatchInvoiceEmail()` - Line 874: Notifies worker that batch invoice is ready
- **Status:** ✅ **ACTIVE**

#### `sendBatchInvoicesEmail(to, name, batchDetails)`
- **Called In:** `src/services/invoice.service.ts`
- **Functions:**
  - `sendBatchInvoicesToParticipant()` - Line 460: Sends multiple invoices at once
- **Status:** ✅ **ACTIVE**

---

## ⚠️ Email Methods NOT YET Integrated

These methods exist in `email.service.ts` but are not yet being called anywhere in the application:

### 1. **`sendDocumentVerificationEmail(to, name, documentDetails)`**
- **Purpose:** Notify users about document verification status (approved/rejected)
- **Should Be Called In:** Document verification service (if exists) or admin service
- **Use Case:** When admin approves/rejects identity documents, police checks, etc.
- **Status:** ⚠️ **NOT YET USED**

### 2. **`sendSubscriptionConfirmationEmail(to, name, subscriptionDetails)`**
- **Purpose:** Confirm subscription purchase
- **Should Be Called In:** Subscription/payment service (if exists)
- **Use Case:** When participant subscribes to a plan
- **Status:** ⚠️ **NOT YET USED** (May be for future feature)

### 3. **`sendDocumentExpiryReminderEmail(to, name, documentDetails)`**
- **Purpose:** Remind workers about expiring documents
- **Should Be Called In:** Scheduled job/cron service
- **Use Case:** Automated reminders 30/14/7 days before document expiration
- **Status:** ⚠️ **NOT YET USED** (Requires cron job implementation)

---

## 📊 Integration Summary

| Email Method | Service | Function | Status |
|-------------|---------|----------|--------|
| `sendVerificationOTP` | auth.service.ts | register(), resendVerificationOTP() | ✅ Active |
| `sendPasswordResetOTP` | auth.service.ts | forgotPassword() | ✅ Active |
| `sendShiftBookingEmail` | notification.service.ts | notifyWorkerOfNewShift() | ✅ **Now Active** |
| `sendTimesheetApprovalEmail` | notification.service.ts | notifyWorkerOfTimesheetApproval/Rejection() | ✅ **Now Active** |
| `sendInvoiceEmail` | invoice.service.ts | sendInvoiceToParticipant() | ✅ Active |
| `sendBatchInvoiceEmail` | batchInvoice.service.ts | sendBatchInvoiceEmail() | ✅ Active |
| `sendWorkerBatchInvoiceEmail` | batchInvoice.service.ts | sendBatchInvoiceEmail() | ✅ Active |
| `sendBatchInvoicesEmail` | invoice.service.ts | sendBatchInvoicesToParticipant() | ✅ Active |
| `sendDocumentVerificationEmail` | Not called | - | ⚠️ Not Used |
| `sendSubscriptionConfirmationEmail` | Not called | - | ⚠️ Not Used |
| `sendDocumentExpiryReminderEmail` | Not called | - | ⚠️ Not Used |

---

## 🔄 Recent Changes (Today)

### Updated: `notification.service.ts`

**Before:** NotificationService only logged messages to console  
**After:** NotificationService now sends actual emails via emailService

**Changes Made:**
1. ✅ Added `import { emailService } from './email.service'`
2. ✅ Added `import Shift from '../models/shift.model'`
3. ✅ Added `import ServiceType from '../models/serviceType.model'`
4. ✅ Updated `notifyWorkerOfNewShift()` to call `emailService.sendShiftBookingEmail()`
5. ✅ Updated `notifyWorkerOfTimesheetApproval()` to call `emailService.sendTimesheetApprovalEmail()`
6. ✅ Updated `notifyWorkerOfTimesheetRejection()` to call `emailService.sendTimesheetApprovalEmail()`

---

## 🎯 Recommendations

### For Immediate Implementation:

1. **Document Verification Emails**
   - If you have a document verification workflow, integrate `sendDocumentVerificationEmail()`
   - Call it when admin approves/rejects worker documents

2. **Document Expiry Reminders**
   - Set up a cron job to check for expiring documents
   - Call `sendDocumentExpiryReminderEmail()` for documents expiring in 30/14/7 days

3. **Subscription Emails**
   - If you have a subscription feature, integrate `sendSubscriptionConfirmationEmail()`
   - Call it after successful payment processing

### Testing:

To test the newly integrated emails:
1. **Shift Booking Email:** Create a new shift and assign a worker
2. **Timesheet Approval Email:** Submit and approve a timesheet
3. **Timesheet Rejection Email:** Submit and reject a timesheet with a reason

---

## 📝 Notes

- All email methods use the new reusable email template from `src/utils/email-template.ts`
- Emails are sent asynchronously and errors are logged but don't break the main flow
- Email sending happens in `notification.service.ts` to centralize all notification logic
- The system gracefully handles missing user data (returns early if user not found)

---

**Last Updated:** October 28, 2025  
**Updated By:** AI Assistant  
**Status:** All critical email notifications now integrated ✅

