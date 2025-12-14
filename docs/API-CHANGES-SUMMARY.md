# API Changes Summary - December 2024

## Overview

This document provides a comprehensive summary of all uncommitted API changes and new features added to the Guardian Care Pro API.

## Table of Contents

1. [Service Categories API](#service-categories-api) - NEW
2. [Resume Upload API](#resume-upload-api) - NEW
3. [Worker & Participant Model Updates](#worker--participant-model-updates) - UPDATED
4. [Incident Management Updates](#incident-management-updates) - UPDATED
5. [Service Type Updates](#service-type-updates) - UPDATED
6. [Location Data Updates](#location-data-updates) - UPDATED
7. [Cloudinary Integration Updates](#cloudinary-integration-updates) - UPDATED

---

## Service Categories API

**Status:** ✨ NEW

### What's New

Complete CRUD API for managing service categories - hierarchical groupings of service types.

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/service-categories` | Get all categories with filtering/pagination | All users |
| GET | `/api/service-categories/:id` | Get category by ID | All users |
| GET | `/api/service-categories/status/:status` | Get categories by status | All users |
| GET | `/api/service-categories/statistics` | Get category statistics | Admin only |
| POST | `/api/service-categories` | Create new category | Admin only |
| PUT | `/api/service-categories/:id` | Update category | Admin only |
| DELETE | `/api/service-categories/:id` | Delete category | Admin only |

### Key Features

- **7 Pre-seeded Categories**: System comes with 7 main service categories
- **Hierarchical Structure**: Categories contain subcategories (service types)
- **Bidirectional References**: Categories reference service types and vice versa
- **Seed Script**: `npm run seed:services` to populate/refresh data

### Related Files

- Route: [serviceCategory.route.ts](/src/routes/serviceCategory.route.ts)
- Controller: [serviceCategory.controller.ts](/src/controllers/serviceCategory.controller.ts)
- Service: [serviceCategory.service.ts](/src/services/serviceCategory.service.ts)
- Model: [serviceCategory.model.ts](/src/models/serviceCategory.model.ts)
- Validation: [serviceCategory.validation.ts](/src/utils/validation/serviceCategory.validation.ts)
- Seed Script: [cleanup-and-seed-services.ts](/scripts/cleanup-and-seed-services.ts)

### Documentation

📄 [Full API Documentation](/docs/api/service-categories.md)

---

## Resume Upload API

**Status:** ✨ NEW

### What's New

Support workers can now upload their resume/CV documents via a dedicated endpoint.

### Endpoint

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/upload-resume` | Upload resume document | Support Worker only |

### Key Features

- **Accepted Formats**: PDF, JPG, JPEG, PNG
- **File Size Limit**: 10 MB maximum
- **Cloudinary Storage**: Files stored in `user-documents/` folder
- **URL Validation**: Resume URLs validated before storage
- **Required for Onboarding**: Resume now required during worker onboarding

### Integration

```javascript
const formData = new FormData();
formData.append('file', resumeFile);

await axios.post('/api/users/upload-resume', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Related Files

- Route: [user.route.ts](/src/routes/user.route.ts) - Line 26
- Controller: [user.controller.ts](/src/controllers/user.controller.ts)
- Service: [user.service.ts](/src/services/user.service.ts) - `uploadResume()` method
- Cloudinary: [cloudinary.ts](/src/utils/cloudinary.ts) - `uploadDocument()` method

### Documentation

📄 [Full API Documentation](/docs/api/resume-upload.md)

---

## Worker & Participant Model Updates

**Status:** 🔄 UPDATED

### Worker Model Changes

**New Fields:**
- `serviceCategories` - Array of ServiceCategory ObjectIds
- `resume` - URL to uploaded resume document

**Updated Fields:**
- `hourlyRate.baseRate` - Minimum value now 38 (AUD)
- `hourlyRate.weekendRate` - Minimum value now 38
- `hourlyRate.holidayRate` - Minimum value now 38
- `hourlyRate.overnightRate` - Minimum value now 38
- `shiftRates[].hourlyRate` - Minimum value now 38

**Validation Updates:**
- Resume URL must be valid
- At least 1 service category required
- Experience end date must be after start date
- Availability time slots must not overlap within same day

### Participant Model Changes

**New Fields:**
- `serviceCategories` - Array of ServiceCategory ObjectIds
- `behaviorSupportPractitioner` - BSP contact details

**Updated Fields:**
- `supportNeeds` - Now optional (can use serviceCategories instead)
- `planManager` - Email now optional
- `coordinator` - Email now optional

### Onboarding Changes

**Worker Onboarding:**
```json
{
  "serviceCategories": ["60f7...", "60f8..."],
  "resume": "https://res.cloudinary.com/.../document.pdf",
  "hourlyRate": {
    "baseRate": 42  // Min 38
  },
  // ... other fields
}
```

**Participant Onboarding:**
```json
{
  "serviceCategories": ["60f7...", "60f8..."],
  "behaviorSupportPractitioner": {
    "name": "Dr. Sarah Johnson",
    "email": "sarah@bsp.com.au"
  },
  // ... other fields
}
```

### Related Files

- Worker Model: [worker.model.ts](/src/models/worker.model.ts)
- Participant Model: [participant.model.ts](/src/models/participant.model.ts)
- User Service: [user.service.ts](/src/services/user.service.ts)
- Validation: [validation.ts](/src/utils/validation.ts) - Worker/Participant schemas

### Documentation

📄 [Full API Documentation](/docs/api/onboarding-updates.md)

---

## Incident Management Updates

**Status:** 🔄 UPDATED

### Permission Changes

**Previous:**
- Only admins could resolve incidents
- Only admins could change incident status

**New:**
- ✅ Admins can resolve/change status (unchanged)
- ✅ **Participants who have incidents reported against them** can:
  - Resolve incidents reported against them
  - Change status of incidents reported against them

### Response Population Changes

**Previous:**
```json
{
  "reportedBy": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

**New:**
```json
{
  "reportedBy": {
    "_id": "...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SUPPORT_WORKER",
    "status": "ACTIVE",
    "phone": "+61412345678",
    "profileImage": "https://...",
    // All user fields (except password)
  }
}
```

### Affected Endpoints

- `PATCH /api/incidents/:id/status` - Permission updated
- `PATCH /api/incidents/:id/resolve` - Permission updated
- `GET /api/incidents` - Full population
- `GET /api/incidents/:id` - Full population
- `GET /api/incidents/shift/:shiftId` - Full population
- `GET /api/incidents/reporter/:userId` - Full population
- `GET /api/incidents/against/:userId` - Full population
- `POST /api/incidents` - Response with full population

### Related Files

- Service: [incident.service.ts](/src/services/incident.service.ts)
- Permissions: [incident-permissions.ts](/src/utils/incident-permissions.ts)

### Documentation

📄 [Full API Documentation](/docs/api/incident-updates.md)

---

## Service Type Updates

**Status:** 🔄 UPDATED

### New Features

- **Category Reference**: Service types now reference their parent category
- **Grouped Endpoint**: New endpoint to get service types grouped by category
- **Category Filtering**: Filter service types by category ID
- **Bidirectional Sync**: Creating/updating service types automatically updates parent category

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/service-types/by-category` | Get service types grouped by category |

### Updated Service Type Creation

```json
POST /api/service-types
{
  "name": "Personal Care",
  "code": "PERSONAL_CARE",
  "categoryId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "status": "active"
}
```

### Key Changes

- `category` field now required when creating service types
- Category's `subCategories` array automatically updated
- Service types can be filtered by `categoryId`
- Responses include populated category details

### Related Files

- Route: [serviceType.route.ts](/src/routes/serviceType.route.ts)
- Service: [serviceType.service.ts](/src/services/serviceType.service.ts)
- Validation: [validation.ts](/src/utils/validation.ts) - ServiceType schemas

### Documentation

📄 [Service Types API](/docs/api/service-types.md)

---

## Location Data Updates

**Status:** 🔄 UPDATED

### Changes

**Removed:**
- Suburbs seeding functionality removed from location seed script
- Sample suburb data removed

**Updated:**
- Regions expanded from ~25 to 53 regions (based on AU Tier 3 Taxonomy)
- Service areas expanded from ~15 to 111 service areas
- All regions and service areas now follow standardized naming conventions

### New Data Structure

**Regions:** 53 total across all states
- ACT: 1 region
- NSW: 11 regions
- NT: 2 regions
- QLD: 9 regions
- SA: 4 regions
- TAS: 3 regions
- VIC: 8 regions
- WA: 8 regions

**Service Areas:** 111 total
- Each region has multiple service areas
- Standardized codes: `{STATE}-{REGION}-{AREA}`
- Example: `NSW-SYD-IW` (NSW - Sydney - Inner West)

### Related Files

- Seed: [location.seed.ts](/src/seed/location.seed.ts)
- Script: [seed-locations.ts](/scripts/seed-locations.ts)

### Documentation

📄 [Location API](/docs/LOCATION-API-QUICK-REFERENCE.md)

---

## Cloudinary Integration Updates

**Status:** 🔄 UPDATED

### Key Changes

**Removed:**
- `multer-storage-cloudinary` package dependency
- `CloudinaryStorage` class usage

**Added:**
- Memory storage strategy using `multer.memoryStorage()`
- Buffer-to-stream conversion helper: `uploadBufferToCloudinary()`
- Enhanced file type validation
- File size limits per upload type

### New Architecture

1. **File Upload Flow:**
   - File buffered in memory (no disk writes)
   - Buffer converted to stream
   - Stream piped to Cloudinary upload
   - Temporary buffer cleaned up automatically

2. **Upload Functions:**
   - `uploadProfileImage()` - Supports file path OR buffer
   - `uploadReceiptImage()` - Supports file path OR buffer
   - `uploadDocument()` - Supports file path OR buffer

3. **Multer Configurations:**
   - `profileUpload` - 5MB limit, images only
   - `receiptUpload` - 5MB limit, images only
   - `documentUpload` - 10MB limit, images + PDFs

### Benefits

- **No Constructor Errors**: Eliminates CloudinaryStorage compatibility issues
- **More Control**: Direct access to upload stream
- **Better Validation**: Custom file type and size checks
- **Backward Compatible**: Still supports file path uploads

### Folder Structure (Unchanged)

- Profile images: `user-profiles/`
- Receipt images: `receipt-images/`
- Documents: `user-documents/`

### Related Files

- Utility: [cloudinary.ts](/src/utils/cloudinary.ts)
- Types: [index.d.ts](/src/types/index.d.ts)

### Documentation

📄 [Cloudinary Setup Guide](/docs/email-image-setup-guide.md)

---

## Database Seed Scripts

### New Scripts

1. **Service Categories & Types Seed**
   - **Command:** `npm run seed:services`
   - **File:** `/scripts/cleanup-and-seed-services.ts`
   - **Purpose:** Clean and re-seed service categories and types
   - **What it does:**
     - Deletes all existing service types and categories
     - Drops problematic indexes
     - Seeds 7 categories and 31 service types
     - Establishes bidirectional relationships
     - Verifies data integrity

### Updated Scripts

1. **Location Seed Script**
   - **Command:** `npm run seed:locations`
   - **Changes:** Removed suburb seeding, added more regions and service areas

---

## Breaking Changes

### ⚠️ Breaking Changes

1. **Service Type Creation**
   - Now requires `categoryId` field
   - Must provide valid ServiceCategory ObjectId

2. **Worker Onboarding**
   - `resume` field now **required**
   - `serviceCategories` field now **required**
   - Minimum hourly rates increased to 38

3. **Participant Onboarding**
   - `serviceCategories` field now **required**

4. **Incident Responses**
   - User objects now fully populated (larger response size)
   - Frontend code may need updates to handle additional fields

### 🔧 Migration Required

1. **Existing Workers:**
   - Must upload resume
   - Must select service categories
   - May need to update hourly rates if below 38

2. **Existing Participants:**
   - Must select service categories

3. **Frontend Applications:**
   - Update incident handling to work with full user objects
   - Add service category selection to onboarding flows
   - Add resume upload to worker onboarding

---

## New Environment Variables

No new environment variables required for these changes.

---

## Database Migrations

### Required Migrations

1. **Add serviceCategories to existing users:**
   ```javascript
   // Workers
   db.users.updateMany(
     { role: 'SUPPORT_WORKER', serviceCategories: { $exists: false } },
     { $set: { serviceCategories: [] } }
   );
   
   // Participants
   db.users.updateMany(
     { role: 'PARTICIPANT', serviceCategories: { $exists: false } },
     { $set: { serviceCategories: [] } }
   );
   ```

2. **Seed service categories:**
   ```bash
   npm run seed:services
   ```

3. **Drop old indexes (if any):**
   ```javascript
   db.servicecategories.dropIndexes();
   db.servicetypes.dropIndexes();
   ```

---

## Testing Checklist

### API Testing

- [ ] Service Categories CRUD operations
- [ ] Resume upload for support workers
- [ ] Worker onboarding with new required fields
- [ ] Participant onboarding with new required fields
- [ ] Incident status change by reported-against user
- [ ] Incident resolution by reported-against user
- [ ] Service type creation with category reference
- [ ] Grouped service types endpoint

### Integration Testing

- [ ] Seed script execution
- [ ] Cloudinary uploads (profile, receipt, document)
- [ ] Category-type relationship integrity
- [ ] Full user population in incident responses
- [ ] Hourly rate validation (minimum 38)

### Frontend Testing

- [ ] Service category selection UI
- [ ] Resume upload UI
- [ ] Incident management with new permissions
- [ ] Display of full user objects
- [ ] Onboarding flow with new required fields

---

## Documentation Files

All new API documentation files are located in `/docs/api/`:

1. 📄 [service-categories.md](/docs/api/service-categories.md) - Service Categories API
2. 📄 [resume-upload.md](/docs/api/resume-upload.md) - Resume Upload API
3. 📄 [onboarding-updates.md](/docs/api/onboarding-updates.md) - Worker/Participant Updates
4. 📄 [incident-updates.md](/docs/api/incident-updates.md) - Incident Management Updates
5. 📄 [service-types.md](/docs/api/service-types.md) - Service Types API (updated)

---

## Support & Questions

For questions about these changes, please refer to:
- Individual API documentation files above
- [Main README](/README.md)
- [Quick Start Guide](/QUICK-START.md)

---

**Last Updated:** December 13, 2025  
**API Version:** 1.0.0  
**Status:** Ready for Testing
