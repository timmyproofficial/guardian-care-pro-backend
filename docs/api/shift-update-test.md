# Shift Update Validation Test

This document provides test cases to verify that the shift update validation fix is working correctly.

## Issue Fixed
Previously, when updating a shift with only the `status` field (e.g., to "completed"), the system was incorrectly trying to validate the `serviceTypeId` field even though it wasn't provided in the request.

## Test Cases

### ✅ Test 1: Update Shift Status Only (Should Work)

**Request:**
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "completed"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shift": {
      "_id": "...",
      "status": "completed",
      // ... other shift fields
    }
  },
  "message": "Shift updated successfully"
}
```

### ✅ Test 2: Update Multiple Fields Without ServiceTypeId (Should Work)

**Request:**
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "in_progress",
  "specialInstructions": "Updated instructions"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shift": {
      "_id": "...",
      "status": "in_progress",
      "specialInstructions": "Updated instructions",
      // ... other shift fields
    }
  },
  "message": "Shift updated successfully"
}
```

### ✅ Test 3: Update ServiceTypeId (Should Work)

**Request:**
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "serviceTypeId": "{{valid_service_type_id}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "shift": {
      "_id": "...",
      "serviceTypeId": {
        "_id": "{{valid_service_type_id}}",
        "name": "Personal Care",
        "code": "PERSONAL_CARE",
        "status": "active"
      },
      // ... other shift fields
    }
  },
  "message": "Shift updated successfully"
}
```

### ❌ Test 4: Invalid ServiceTypeId (Should Fail)

**Request:**
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "serviceTypeId": "507f1f77bcf86cd799439999"
}
```

**Expected Response:**
```json
{
  "success": false,
  "code": 400,
  "error": "Service type not found or inactive"
}
```

### ❌ Test 5: Malformed ServiceTypeId (Should Fail)

**Request:**
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "serviceTypeId": "invalid-id"
}
```

**Expected Response:**
```json
{
  "success": false,
  "code": 400,
  "error": "Invalid ServiceType ID format"
}
```

## Common Status Transitions for Workers

### Worker Accepting a Shift
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{worker_access_token}}
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Worker Starting a Shift
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{worker_access_token}}
Content-Type: application/json

{
  "status": "in_progress"
}
```

### Worker Completing a Shift
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{worker_access_token}}
Content-Type: application/json

{
  "status": "completed"
}
```

### Worker Cancelling a Shift
```http
PATCH /api/v1/v1/shifts/{{shift_id}}
Authorization: Bearer {{worker_access_token}}
Content-Type: application/json

{
  "status": "cancelled"
}
```

## Troubleshooting

If you're still getting the "Service type not found or inactive" error when updating shift status:

1. **Check your request body** - Make sure you're only sending the fields you want to update
2. **Verify the shift exists** - The shift ID should be valid
3. **Check user permissions** - Make sure the user has permission to update the shift
4. **Verify status transition** - Some status transitions have business logic restrictions

## Validation Rules Summary

### External Validation (Fixed)
- `serviceTypeId` external validation now only runs when the field is provided and has a valid value
- Empty, null, undefined, or malformed ObjectIds skip external validation
- Only active service types are considered valid

### Permission-Based Validation
- **Participants**: Can only update status to "cancelled"
- **Workers**: Can update status to "confirmed", "in_progress", "completed", or "cancelled"
- **Admins**: Can update any field and any status

### Status Transition Rules
- **confirmed**: Only pending shifts/assignments can be confirmed
- **in_progress**: Only confirmed shifts/assignments can be started
- **completed**: Only in-progress shifts/assignments can be completed
- **cancelled**: Any status can be cancelled

## Fixed Issues

1. ✅ External validation only runs when `serviceTypeId` is provided
2. ✅ Improved error handling for database connection issues
3. ✅ Better type checking for validation errors
4. ✅ Trimmed whitespace handling for ObjectId validation

The validation now correctly handles optional fields and only validates service types when they are actually being updated. 