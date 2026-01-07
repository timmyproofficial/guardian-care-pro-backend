# Worker and Participant Onboarding Updates

## Overview

This document details the recent updates to Worker and Participant onboarding processes, specifically regarding the new `serviceCategories` field and related validation changes.

## Key Changes

### 1. Service Categories Field

Both Worker and Participant models now include a `serviceCategories` field that references ServiceCategory documents. This provides a higher-level categorization beyond individual service types.

### 2. Worker Model Updates

**New Fields:**
- `serviceCategories` - Array of ServiceCategory ObjectIds
- `resume` - URL to uploaded resume document

**Updated Fields:**
- `hourlyRate.baseRate` - Now has a minimum value of 38 (AUD minimum wage)
- `hourlyRate.weekendRate` - Minimum value of 38
- `hourlyRate.holidayRate` - Minimum value of 38
- `hourlyRate.overnightRate` - Minimum value of 38
- `shiftRates[].hourlyRate` - Minimum value of 38

### 3. Participant Model Updates

**New Fields:**
- `serviceCategories` - Array of ServiceCategory ObjectIds

**Updated Fields:**
- `supportNeeds` - Now optional (can rely on serviceCategories instead)

---

## Worker Onboarding API

### Endpoint

`POST /api/v1/users/workers/onboarding`

### Updated Request Body

```json
{
  "bio": "Experienced support worker with 5 years in disability care",
  "skills": ["60f7b3b3b3b3b3b3b3b3b3b4", "60f7b3b3b3b3b3b3b3b3b3b5"],
  "serviceCategories": ["60f7b3b3b3b3b3b3b3b3b3b3", "60f7b3b3b3b3b3b3b3b3b3b2"],
  "languages": ["English", "Spanish", "Mandarin"],
  "experience": [
    {
      "title": "Support Worker",
      "organization": "Care Plus Services",
      "startDate": "2019-01-15",
      "endDate": "2024-03-20",
      "description": "Provided personal care and community access support"
    }
  ],
  "resume": "https://res.cloudinary.com/guardiancare/image/upload/v1702468800/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf",
  "hourlyRate": {
    "baseRate": 42,
    "weekendRate": 50,
    "holidayRate": 60,
    "overnightRate": 55
  },
  "shiftRates": [
    {
      "rateTimeBandId": "60f7b3b3b3b3b3b3b3b3b3b6",
      "hourlyRate": 45
    },
    {
      "rateTimeBandId": "60f7b3b3b3b3b3b3b3b3b3b7",
      "hourlyRate": 55
    }
  ],
  "availability": {
    "weekdays": [
      {
        "day": "monday",
        "available": true,
        "slots": [
          {
            "start": "09:00",
            "end": "17:00"
          }
        ]
      },
      {
        "day": "tuesday",
        "available": true,
        "slots": [
          {
            "start": "09:00",
            "end": "17:00"
          }
        ]
      },
      {
        "day": "wednesday",
        "available": true,
        "slots": [
          {
            "start": "09:00",
            "end": "13:00"
          },
          {
            "start": "14:00",
            "end": "18:00"
          }
        ]
      },
      {
        "day": "thursday",
        "available": false,
        "slots": []
      },
      {
        "day": "friday",
        "available": true,
        "slots": [
          {
            "start": "09:00",
            "end": "17:00"
          }
        ]
      },
      {
        "day": "saturday",
        "available": true,
        "slots": [
          {
            "start": "10:00",
            "end": "16:00"
          }
        ]
      },
      {
        "day": "sunday",
        "available": false,
        "slots": []
      }
    ],
    "unavailableDates": ["2024-12-25", "2025-01-01"]
  },
  "stateId": "60f7b3b3b3b3b3b3b3b3b3b8",
  "regionId": "60f7b3b3b3b3b3b3b3b3b3b9",
  "serviceAreaId": "60f7b3b3b3b3b3b3b3b3b3c1",
  "baseLocation": {
    "latitude": -33.8688,
    "longitude": 151.2093
  },
  "travelRadiusKm": 25,
  "address": "123 Main Street, Sydney NSW 2000"
}
```

### Field Descriptions

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| serviceCategories | ObjectId[] | Yes | Array of service category IDs the worker can provide | Min 1 category required |
| resume | string | Yes | URL to uploaded resume document | Must be valid URL |
| hourlyRate.baseRate | number | Yes | Base hourly rate (AUD) | Minimum 38 |
| hourlyRate.weekendRate | number | No | Weekend hourly rate (AUD) | Minimum 38 |
| hourlyRate.holidayRate | number | No | Holiday hourly rate (AUD) | Minimum 38 |
| hourlyRate.overnightRate | number | No | Overnight hourly rate (AUD) | Minimum 38 |
| shiftRates[].hourlyRate | number | Yes | Rate for specific time band (AUD) | Minimum 38 |
| experience[].endDate | date | No | Must be after startDate | - |
| availability.weekdays[].slots | array | - | Must not overlap within same day | - |

### Response Example

```json
{
  "success": true,
  "message": "Worker onboarding completed successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SUPPORT_WORKER",
    "status": "ACTIVE",
    "onboardingComplete": true,
    "bio": "Experienced support worker with 5 years in disability care",
    "skills": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Personal Care",
        "code": "PERSONAL_CARE"
      }
    ],
    "serviceCategories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Assistance with Daily Life (Core)",
        "status": "active"
      }
    ],
    "resume": "https://res.cloudinary.com/guardiancare/image/upload/v1702468800/user-documents/document-60f7b3b3b3b3b3b3b3b3b3b3.pdf",
    "languages": ["English", "Spanish", "Mandarin"],
    "experience": [...],
    "hourlyRate": {
      "baseRate": 42,
      "weekendRate": 50,
      "holidayRate": 60,
      "overnightRate": 55
    },
    "shiftRates": [...],
    "availability": {...},
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

## Participant Onboarding API

### Endpoint

`POST /api/v1/users/participants/onboarding`

### Updated Request Body

```json
{
  "supportNeeds": ["60f7b3b3b3b3b3b3b3b3b3b4", "60f7b3b3b3b3b3b3b3b3b3b5"],
  "serviceCategories": ["60f7b3b3b3b3b3b3b3b3b3b3", "60f7b3b3b3b3b3b3b3b3b3b2"],
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Sister",
    "phone": "+61412345678"
  },
  "planManager": {
    "name": "ABC Plan Management",
    "email": "contact@abcplanmanagement.com.au"
  },
  "coordinator": {
    "name": "John Smith",
    "email": "john.smith@coordinator.com.au"
  },
  "behaviorSupportPractitioner": {
    "name": "Dr. Sarah Johnson",
    "email": "sarah.johnson@bsp.com.au"
  },
  "preferredLanguages": ["English"],
  "ndisNumber": "123456789",
  "stateId": "60f7b3b3b3b3b3b3b3b3b3b8",
  "regionId": "60f7b3b3b3b3b3b3b3b3b3b9",
  "suburbId": "60f7b3b3b3b3b3b3b3b3b3c1",
  "serviceAreaId": "60f7b3b3b3b3b3b3b3b3b3c2",
  "participantLocation": {
    "latitude": -33.8688,
    "longitude": 151.2093
  },
  "address": "456 Park Avenue, Sydney NSW 2000"
}
```

### Field Descriptions

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| supportNeeds | ObjectId[] | No | Array of specific service type IDs needed | Min 1 if provided |
| serviceCategories | ObjectId[] | Yes | Array of service category IDs needed | Min 1 category required |
| emergencyContact | object | Yes | Emergency contact information | - |
| planManager | object | No | Plan manager details | Valid email if provided |
| coordinator | object | No | Coordinator details | Valid email if provided |
| behaviorSupportPractitioner | object | No | BSP details | Valid email if provided |
| ndisNumber | string | No | NDIS participant number | 9 digits |

### Response Example

```json
{
  "success": true,
  "message": "Participant onboarding completed successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3d1",
    "email": "participant@example.com",
    "firstName": "Sarah",
    "lastName": "Williams",
    "role": "PARTICIPANT",
    "status": "ACTIVE",
    "onboardingComplete": true,
    "supportNeeds": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Personal Care",
        "code": "PERSONAL_CARE"
      }
    ],
    "serviceCategories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Assistance with Daily Life (Core)",
        "status": "active"
      }
    ],
    "emergencyContact": {
      "name": "Jane Doe",
      "relationship": "Sister",
      "phone": "+61412345678"
    },
    "planManager": {
      "name": "ABC Plan Management",
      "email": "contact@abcplanmanagement.com.au"
    },
    "coordinator": {
      "name": "John Smith",
      "email": "john.smith@coordinator.com.au"
    },
    "behaviorSupportPractitioner": {
      "name": "Dr. Sarah Johnson",
      "email": "sarah.johnson@bsp.com.au"
    },
    "ndisNumber": "123456789",
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

## Validation Rules

### Worker Validation

1. **Service Categories**: At least 1 category required
2. **Resume**: Must be a valid URL, required field
3. **Hourly Rates**: All rates must be ≥ 38 (AUD minimum wage)
4. **Shift Rates**: All shift rates must be ≥ 38
5. **Experience End Date**: Must be after start date if provided
6. **Availability Time Slots**: 
   - Start time must be before end time
   - Slots must not overlap within the same day
7. **Experience**: At least one experience entry required

### Participant Validation

1. **Service Categories**: At least 1 category required
2. **Support Needs**: At least 1 service type required if provided
3. **Emergency Contact**: Name, relationship, and phone required
4. **NDIS Number**: Must be exactly 9 digits if provided
5. **Email Addresses**: Valid email format for plan manager, coordinator, and BSP

---

## Migration Notes

### For Existing Workers

Existing workers without `serviceCategories` or `resume` fields should be prompted to:
1. Upload their resume via `/api/v1/users/upload-resume`
2. Select their service categories
3. Complete onboarding again if needed

### For Existing Participants

Existing participants without `serviceCategories` should be prompted to:
1. Select their service categories
2. Update their support needs if needed

---

## Benefits of Service Categories

1. **Simplified Selection**: Users can select broad categories instead of individual service types
2. **Better Matching**: Easier to match workers with participants at a category level
3. **Scalability**: Adding new service types doesn't require updating all user profiles
4. **Flexibility**: Users can specify both categories and specific service types
5. **Analytics**: Better reporting on service category demand and supply

---

## Example Service Categories

The system includes 7 main categories:

1. **Assistance with Daily Life (Core)** - 8 service types
2. **Community & Social Participation** - 4 service types
3. **Transport & Travel Support** - 3 service types
4. **Household & Domestic Support** - 4 service types
5. **Capacity Building, Therapy & Daily Living Skills** - 4 service types
6. **Supported / Shared Living & Group / Centre-Based Supports** - 4 service types
7. **Assistive Technology Support** - 4 service types

---

## Related Documentation

- [Service Categories API](/docs/api/v1/service-categories.md)
- [Service Types API](/docs/api/v1/service-types.md)
- [Resume Upload API](/docs/api/v1/resume-upload.md)
- [User API](/docs/api/v1/users.md)
