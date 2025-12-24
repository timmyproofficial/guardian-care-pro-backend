# Incident Management API Updates

## Overview

This document details the recent updates to the Incident Management API, specifically changes to permissions and data population in responses.

## Key Changes

### 1. Permission Updates

The incident management system now allows participants (users who have incidents reported against them) to manage incidents:

**Previous Behavior:**
- Only admins could resolve incidents
- Only admins could change incident status

**New Behavior:**
- Admins can resolve incidents and change status
- Participants who have incidents reported **against** them can also:
  - Resolve incidents reported against them
  - Change status of incidents reported against them (e.g., from OPEN to IN_REVIEW)

### 2. Response Data Population

All incident endpoints now return **fully populated** user documents instead of limited field selections:

**Previous Behavior:**
```json
{
  "reportedBy": {
    "_id": "...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

**New Behavior:**
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
    // ... all other user fields except password
  }
}
```

This applies to:
- `reportedBy` - Full worker/user document
- `reportedAgainst` - Full participant/user document
- `resolvedBy` - Full user document (if resolved)

---

## Updated Endpoints

### 1. Update Incident Status

**Endpoint:** `PATCH /api/v1/incidents/:incidentId/status`

**Permission Changes:**
- ✅ Admins can update any incident status
- ✅ **NEW:** Participants who have the incident reported against them can update status

**Request Example:**

```http
PATCH /api/v1/incidents/60f7b3b3b3b3b3b3b3b3b3b3/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "IN_REVIEW",
  "updatedBy": "60f7b3b3b3b3b3b3b3b3b3d1"
}
```

**Response Example (with full user population):**

```json
{
  "success": true,
  "message": "Incident status updated successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "shiftId": "60f7b3b3b3b3b3b3b3b3b3b2",
    "title": "Late arrival to shift",
    "description": "Worker arrived 30 minutes late without prior notice",
    "severity": "MEDIUM",
    "status": "IN_REVIEW",
    "reportedBy": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3c1",
      "email": "supervisor@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "SUPPORT_COORDINATOR",
      "status": "ACTIVE",
      "phone": "+61412345679",
      "profileImage": "https://res.cloudinary.com/..."
    },
    "reportedAgainst": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3d1",
      "email": "worker@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "SUPPORT_WORKER",
      "status": "ACTIVE",
      "phone": "+61412345678",
      "bio": "Experienced support worker...",
      "skills": [...],
      "hourlyRate": {
        "baseRate": 42
      }
    },
    "resolvedBy": null,
    "resolutionNote": null,
    "urlLinks": [],
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

### 2. Resolve Incident

**Endpoint:** `PATCH /api/v1/incidents/:incidentId/resolve`

**Permission Changes:**
- ✅ Admins can resolve any incident
- ✅ **NEW:** Participants who have the incident reported against them can resolve it

**Request Example:**

```http
PATCH /api/v1/incidents/60f7b3b3b3b3b3b3b3b3b3b3/resolve
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "resolutionNote": "Apologized for late arrival. Explained there was a traffic accident on the highway. Will ensure to notify in advance in future.",
  "resolvedBy": "60f7b3b3b3b3b3b3b3b3b3d1"
}
```

**Response Example (with full user population):**

```json
{
  "success": true,
  "message": "Incident resolved successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "shiftId": "60f7b3b3b3b3b3b3b3b3b3b2",
    "title": "Late arrival to shift",
    "description": "Worker arrived 30 minutes late without prior notice",
    "severity": "MEDIUM",
    "status": "RESOLVED",
    "reportedBy": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3c1",
      "email": "supervisor@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "SUPPORT_COORDINATOR",
      "status": "ACTIVE"
    },
    "reportedAgainst": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3d1",
      "email": "worker@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "SUPPORT_WORKER",
      "status": "ACTIVE"
    },
    "resolvedBy": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3d1",
      "email": "worker@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "SUPPORT_WORKER",
      "status": "ACTIVE",
      "phone": "+61412345678"
    },
    "resolutionNote": "Apologized for late arrival. Explained there was a traffic accident on the highway. Will ensure to notify in advance in future.",
    "resolvedAt": "2024-12-13T11:30:00.000Z",
    "urlLinks": [],
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

### 3. Get All Incidents

**Endpoint:** `GET /api/v1/incidents`

**Population Changes:**
- All user fields are now fully populated
- `reportedBy`, `reportedAgainst`, and `resolvedBy` include complete user documents

**Response Example:**

```json
{
  "success": true,
  "message": "Incidents retrieved successfully",
  "data": {
    "incidents": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "shiftId": "...",
        "title": "Late arrival to shift",
        "reportedBy": {
          // Full user document
          "_id": "...",
          "email": "...",
          "firstName": "...",
          "lastName": "...",
          "role": "...",
          // All other user fields
        },
        "reportedAgainst": {
          // Full user document
        },
        "resolvedBy": {
          // Full user document (if resolved)
        }
      }
    ],
    "totalCount": 25,
    "totalPages": 3,
    "currentPage": 1
  }
}
```

---

### 4. Get Incidents by Shift

**Endpoint:** `GET /api/v1/incidents/shift/:shiftId`

**Population Changes:**
- Fully populated user documents in responses

---

### 5. Get Incidents by Reporter

**Endpoint:** `GET /api/v1/incidents/reporter/:userId`

**Population Changes:**
- Fully populated user documents
- Now includes full `reportedBy` document (not just limited fields)

---

### 6. Get Incidents Against User

**Endpoint:** `GET /api/v1/incidents/against/:userId`

**Population Changes:**
- Fully populated user documents
- Now includes full `reportedAgainst` document

---

### 7. Get Incident by ID

**Endpoint:** `GET /api/v1/incidents/:incidentId`

**Population Changes:**
- Fully populated user documents in response

---

### 8. Create Incident

**Endpoint:** `POST /api/v1/incidents`

**Population Changes:**
- Response includes fully populated user documents

---

## Permission Matrix

| Action | Admin | Reporter (who created incident) | Reported Against (participant/worker) | Other Users |
|--------|-------|----------------------------------|---------------------------------------|-------------|
| Create Incident | ✅ | ✅ (Support Workers) | ❌ | ❌ |
| View Incident | ✅ | ✅ | ✅ | ❌ |
| Update Incident | ✅ | ✅ (if status = OPEN) | ❌ | ❌ |
| Delete Incident | ✅ | ✅ | ❌ | ❌ |
| Change Status | ✅ | ❌ | ✅ **NEW** | ❌ |
| Resolve Incident | ✅ | ❌ | ✅ **NEW** | ❌ |

---

## Use Cases

### Use Case 1: Worker Resolves Incident Against Themselves

**Scenario:** A support worker had an incident reported against them for being late. They want to provide an explanation and resolve it.

**Steps:**
1. Worker logs in and views incidents reported against them:
   ```http
   GET /api/v1/incidents/against/60f7b3b3b3b3b3b3b3b3b3d1
   ```

2. Worker resolves the incident with an explanation:
   ```http
   PATCH /api/v1/incidents/60f7b3b3b3b3b3b3b3b3b3b3/resolve
   {
     "resolutionNote": "Traffic accident caused delay. Will notify in future.",
     "resolvedBy": "60f7b3b3b3b3b3b3b3b3b3d1"
   }
   ```

3. Incident status changes to `RESOLVED` and resolution note is saved

---

### Use Case 2: Participant Updates Status of Incident

**Scenario:** A participant had an incident reported against them. They want to acknowledge it by changing status to "IN_REVIEW".

**Steps:**
1. Participant views incidents against them:
   ```http
   GET /api/v1/incidents/against/60f7b3b3b3b3b3b3b3b3b3e1
   ```

2. Participant updates incident status:
   ```http
   PATCH /api/v1/incidents/60f7b3b3b3b3b3b3b3b3b3b3/status
   {
     "status": "IN_REVIEW",
     "updatedBy": "60f7b3b3b3b3b3b3b3b3b3e1"
   }
   ```

---

## Benefits of Changes

### 1. Improved Transparency
- Users can now see full context of who reported incidents
- Complete profile information helps with communication

### 2. Better Self-Service
- Workers/participants can manage incidents reported against them
- Reduces admin workload for simple incident resolutions

### 3. Enhanced Accountability
- Full user profiles in responses provide complete audit trail
- Easier to track who made changes and when

### 4. Richer Data for Frontend
- Frontend can display profile pictures, roles, contact info
- Better UX with complete user information

---

## Migration Notes

### Frontend Updates Required

If you're consuming the incidents API, update your code to handle:

1. **Full User Objects**: Instead of just `firstName`, `lastName`, `email`, you'll receive complete user documents
2. **New Permission Logic**: Update UI to show resolve/status buttons for users who have incidents reported against them
3. **Additional Fields**: User objects now include `role`, `status`, `phone`, `profileImage`, etc.

### Example Frontend Update

**Before:**
```javascript
// Old code expecting limited fields
const reporterName = `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`;
```

**After:**
```javascript
// New code with full user object
const reporterName = `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}`;
const reporterRole = incident.reportedBy.role;
const reporterPhone = incident.reportedBy.phone;
const reporterImage = incident.reportedBy.profileImage;

// Show additional context
<div>
  <img src={reporterImage} alt={reporterName} />
  <span>{reporterName} ({reporterRole})</span>
  {canContact && <a href={`tel:${reporterPhone}`}>Call</a>}
</div>
```

---

## Error Responses

### 403 Forbidden - Cannot Resolve

```json
{
  "success": false,
  "message": "You are not authorized to resolve incidents"
}
```

**When this occurs:**
- User is not an admin
- User is not the person the incident was reported against

### 403 Forbidden - Cannot Change Status

```json
{
  "success": false,
  "message": "You are not authorized to change incident status"
}
```

**When this occurs:**
- User is not an admin
- User is not the person the incident was reported against

---

## Related Documentation

- [Incident API](/docs/api/v1/incidents.md) - Main incident API documentation
- [User API](/docs/api/v1/users.md) - User management
- [Shift API](/docs/api/v1/shifts.md) - Shift management

---

## Notes

- Password fields are always excluded from user document responses (using `select: false` in model)
- Sensitive fields like `emailVerificationToken`, `passwordResetToken` are also excluded
- The `toJSON()` method on User model automatically removes these fields
- Fully populated documents may increase response size - consider pagination for large result sets
- Caching strategies may need adjustment due to larger response payloads
