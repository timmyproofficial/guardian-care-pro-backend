# Support24 API - Postman Testing Guide

This guide provides comprehensive sample data for testing the shift and timesheet workflow in Postman.

## Environment Setup

Create a new Postman environment with these variables:

```json
{
  "base_url": "http://localhost:3000/api/v1",
  "access_token": "",
  "refresh_token": "",
  "participant_id": "",
  "worker_id": "",
  "admin_id": "",
  "organization_id": "",
  "service_type_id": "",
  "shift_id": "",
  "timesheet_id": ""
}
```

## 1. Authentication & User Setup

### 1.1 Register Test Users

**Register Participant:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "email": "participant@guardiancare.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Smith",
  "role": "participant",
  "phone": "+61412345678"
}
```

**Register Support Worker:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "email": "worker@guardiancare.com",
  "password": "SecurePass123!",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "role": "support_worker",
  "phone": "+61412345679"
}
```

**Register Admin:**
```http
POST {{base_url}}/auth/register
Content-Type: application/json

{
  "email": "admin@guardiancare.com",
  "password": "SecurePass123!",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "phone": "+61412345680"
}
```

### 1.2 Login Users

**Login as Participant:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "participant@guardiancare.com",
  "password": "SecurePass123!"
}
```

**Test Script for Participant Login:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has access token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.accessToken).to.not.be.undefined;
    pm.environment.set("access_token", jsonData.data.accessToken);
    pm.environment.set("participant_id", jsonData.data.user._id);
});
```

**Login as Support Worker:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "worker@guardiancare.com",
  "password": "SecurePass123!"
}
```

**Test Script for Worker Login:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has access token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.accessToken).to.not.be.undefined;
    pm.environment.set("access_token", jsonData.data.accessToken);
    pm.environment.set("worker_id", jsonData.data.user._id);
});
```

**Login as Admin:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
  "email": "admin@guardiancare.com",
  "password": "SecurePass123!"
}
```

## 2. Initial Setup (Admin Actions)

### 2.1 Create Service Types

**Create Personal Care Service Type:**
```http
POST {{base_url}}/service-types
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Personal Care",
  "code": "PERSONAL_CARE"
}
```

**Test Script:**
```javascript
pm.test("Service type created", function () {
    var jsonData = pm.response.json();
    pm.environment.set("service_type_id", jsonData.data.serviceType._id);
});
```

**Create Additional Service Types:**
```http
POST {{base_url}}/service-types
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Community Participation",
  "code": "COMMUNITY_PARTICIPATION"
}
```

```http
POST {{base_url}}/service-types
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Domestic Assistance",
  "code": "DOMESTIC_ASSISTANCE"
}
```

### 2.2 Create Organization

```http
POST {{base_url}}/organizations
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Guardian Care Services",
  "description": "Providing quality disability support services"
}
```

**Test Script:**
```javascript
pm.test("Organization created", function () {
    var jsonData = pm.response.json();
    pm.environment.set("organization_id", jsonData.data.organization._id);
});
```

### 2.3 Create Rate Time Bands

**Create Standard Rate:**
```http
POST {{base_url}}/rate-time-bands
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Standard Hours",
  "code": "STANDARD",
  "startTime": "07:00",
  "endTime": "18:00",
  "description": "Standard weekday hours",
  "baseRateMultiplier": 1.0
}
```

**Create Evening Rate:**
```http
POST {{base_url}}/rate-time-bands
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Evening Hours",
  "code": "EVENING",
  "startTime": "18:00",
  "endTime": "22:00",
  "description": "Evening hours with higher rate",
  "baseRateMultiplier": 1.25
}
```

**Create Weekend Rate:**
```http
POST {{base_url}}/rate-time-bands
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "name": "Weekend Hours",
  "code": "WEEKEND",
  "description": "Weekend hours with premium rate",
  "isWeekend": true,
  "baseRateMultiplier": 1.5
}
```

## 3. Shift Management Workflow

### 3.1 Create Shift (as Participant)

**Single Worker Shift:**
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": false,
  "workerId": "{{worker_id}}",
  "serviceTypeId": "{{service_type_id}}",
  "startTime": "2024-01-20T09:00:00.000Z",
  "endTime": "2024-01-20T13:00:00.000Z",
  "locationType": "in_person",
  "address": "123 Main Street, Brisbane QLD 4000",
  "shiftType": "regular",
  "requiresSupervision": false,
  "specialInstructions": "Please assist with morning personal care routine and light meal preparation."
}
```

**Multi-Worker Shift:**
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": true,
  "workerIds": ["{{worker_id}}", "507f1f77bcf86cd799439012"],
  "serviceTypeId": "{{service_type_id}}",
  "startTime": "2024-01-22T14:00:00.000Z",
  "endTime": "2024-01-22T18:00:00.000Z",
  "locationType": "in_person",
  "address": "456 Community Center St, Brisbane QLD 4000",
  "shiftType": "community_access",
  "requiresSupervision": true,
  "specialInstructions": "Community outing to shopping center. Two workers required for safety."
}
```

**Recurring Shift:**
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": false,
  "workerId": "{{worker_id}}",
  "serviceTypeId": "{{service_type_id}}",
  "startTime": "2024-01-25T10:00:00.000Z",
  "endTime": "2024-01-25T12:00:00.000Z",
  "locationType": "in_person",
  "address": "789 Residential Ave, Brisbane QLD 4000",
  "shiftType": "regular",
  "requiresSupervision": false,
  "specialInstructions": "Weekly domestic assistance - cleaning and laundry",
  "recurrence": {
    "pattern": "weekly",
    "occurrences": 8
  }
}
```

**Test Script for Shift Creation:**
```javascript
pm.test("Shift created successfully", function () {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    pm.environment.set("shift_id", jsonData.data.shift._id);
});
```

### 3.2 Worker Responds to Shift

**Accept Shift (as Support Worker):**
```http
POST {{base_url}}/shifts/{{shift_id}}/respond
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "accept": true
}
```

**Decline Shift (as Support Worker):**
```http
POST {{base_url}}/shifts/{{shift_id}}/respond
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "accept": false,
  "declineReason": "Schedule conflict - already booked for another shift"
}
```

### 3.3 Update Shift Status

**Update Shift to In Progress:**
```http
PATCH {{base_url}}/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Complete Shift:**
```http
PATCH {{base_url}}/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "completed"
}
```

### 3.4 Get Shifts

**Get All Shifts:**
```http
GET {{base_url}}/shifts
Authorization: Bearer {{access_token}}
```

**Get Shift by ID:**
```http
GET {{base_url}}/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
```

**Get Shifts with Filters:**
```http
GET {{base_url}}/shifts?status=completed&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{access_token}}
```

## 4. Timesheet Management Workflow

### 4.1 Submit Timesheet (as Support Worker)

**Basic Timesheet:**
```http
POST {{base_url}}/timesheets
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shiftId": "{{shift_id}}",
  "actualStartTime": "2024-01-20T09:00:00.000Z",
  "actualEndTime": "2024-01-20T13:00:00.000Z",
  "distanceTravelKm": 25.5,
  "notes": "Shift completed successfully. Provided personal care assistance and meal preparation as requested."
}
```

**Test Script:**
```javascript
pm.test("Timesheet submitted", function () {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    pm.environment.set("timesheet_id", jsonData.data.timesheet._id);
});
```

**Timesheet with Expenses:**
```http
POST {{base_url}}/timesheets
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shiftId": "{{shift_id}}",
  "actualStartTime": "2024-01-22T14:00:00.000Z",
  "actualEndTime": "2024-01-22T18:00:00.000Z",
  "distanceTravelKm": 35.2,
  "notes": "Community outing completed. Assisted with shopping and social activities.",
  "expenses": [
    {
      "description": "Parking fees at shopping center",
      "amount": 8.50,
      "category": "parking"
    },
    {
      "description": "Coffee for participant during outing",
      "amount": 6.00,
      "category": "meals"
    }
  ]
}
```

**Timesheet with Mileage Claims:**
```http
POST {{base_url}}/timesheets
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shiftId": "{{shift_id}}",
  "actualStartTime": "2024-01-25T10:00:00.000Z",
  "actualEndTime": "2024-01-25T12:00:00.000Z",
  "distanceTravelKm": 42.8,
  "notes": "Domestic assistance provided. Completed cleaning tasks and laundry as scheduled.",
  "mileageClaims": [
    {
      "from": "Home",
      "to": "789 Residential Ave, Brisbane QLD 4000",
      "distance": 21.4,
      "purpose": "Travel to shift location"
    },
    {
      "from": "789 Residential Ave, Brisbane QLD 4000",
      "to": "Home",
      "distance": 21.4,
      "purpose": "Return from shift location"
    }
  ]
}
```

### 4.2 Get Timesheets

**Get All Timesheets:**
```http
GET {{base_url}}/timesheets
Authorization: Bearer {{access_token}}
```

**Get Timesheet by ID:**
```http
GET {{base_url}}/timesheets/{{timesheet_id}}
Authorization: Bearer {{access_token}}
```

**Get Timesheets with Filters:**
```http
GET {{base_url}}/timesheets?status=submitted&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {{access_token}}
```

### 4.3 Update Timesheet

**Update Timesheet (as Worker):**
```http
PATCH {{base_url}}/timesheets/{{timesheet_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "notes": "Updated: Shift completed successfully. Additional detail: Provided medication reminders as requested.",
  "distanceTravelKm": 27.0
}
```

### 4.4 Approve Timesheet (as Admin/Organization)

**Approve Timesheet:**
```http
PATCH {{base_url}}/timesheets/{{timesheet_id}}/approve
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "approved": true,
  "adminNotes": "Timesheet approved. All details verified."
}
```

**Reject Timesheet:**
```http
PATCH {{base_url}}/timesheets/{{timesheet_id}}/approve
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "approved": false,
  "adminNotes": "Please provide more detailed notes about the services provided."
}
```

## 5. Complete Shift Lifecycle Example

### Step-by-Step Workflow

**Step 1: Create Shift (as Participant)**
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": false,
  "workerId": "{{worker_id}}",
  "serviceTypeId": "{{service_type_id}}",
  "startTime": "2024-01-30T08:00:00.000Z",
  "endTime": "2024-01-30T16:00:00.000Z",
  "locationType": "in_person",
  "address": "321 Care Home Lane, Brisbane QLD 4000",
  "shiftType": "regular",
  "requiresSupervision": false,
  "specialInstructions": "Full day personal care support including meals, medication assistance, and social activities."
}
```

**Step 2: Worker Accepts Shift**
```http
POST {{base_url}}/shifts/{{shift_id}}/respond
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "accept": true
}
```

**Step 3: Start Shift**
```http
PATCH {{base_url}}/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Step 4: Complete Shift**
```http
PATCH {{base_url}}/shifts/{{shift_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "status": "completed"
}
```

**Step 5: Submit Timesheet**
```http
POST {{base_url}}/timesheets
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "shiftId": "{{shift_id}}",
  "actualStartTime": "2024-01-30T08:00:00.000Z",
  "actualEndTime": "2024-01-30T16:00:00.000Z",
  "distanceTravelKm": 18.5,
  "notes": "Comprehensive personal care support provided throughout the day. Assisted with morning routine, medication administration, meal preparation, and afternoon social activities. Participant was engaged and cooperative throughout the shift.",
  "expenses": [
    {
      "description": "Lunch ingredients from grocery store",
      "amount": 15.50,
      "category": "meals"
    },
    {
      "description": "Parking at community center",
      "amount": 5.00,
      "category": "parking"
    }
  ]
}
```

**Step 6: Approve Timesheet**
```http
PATCH {{base_url}}/timesheets/{{timesheet_id}}/approve
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "approved": true,
  "adminNotes": "Excellent detailed timesheet. All expenses reasonable and well documented."
}
```

## 6. Error Testing Examples

### 6.1 Invalid Service Type ID
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": false,
  "workerId": "{{worker_id}}",
  "serviceTypeId": "invalidServiceTypeId",
  "startTime": "2024-01-20T09:00:00.000Z",
  "endTime": "2024-01-20T13:00:00.000Z",
  "locationType": "in_person",
  "address": "123 Test St",
  "shiftType": "regular"
}
```

Expected Response: `400 Bad Request` with validation error message.

### 6.2 Invalid Date Range
```http
POST {{base_url}}/shifts
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "organizationId": "{{organization_id}}",
  "isMultiWorkerShift": false,
  "workerId": "{{worker_id}}",
  "serviceTypeId": "{{service_type_id}}",
  "startTime": "2024-01-20T13:00:00.000Z",
  "endTime": "2024-01-20T09:00:00.000Z",
  "locationType": "in_person",
  "address": "123 Test St",
  "shiftType": "regular"
}
```

Expected Response: `400 Bad Request` - end time must be after start time.

## 7. Test Validation Scripts

### Common Postman Test Scripts

**Success Response Test:**
```javascript
pm.test("Status code is successful", function () {
    pm.response.to.have.status(200) || pm.response.to.have.status(201);
});

pm.test("Response has correct structure", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData).to.have.property('message');
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

**Shift Data Validation:**
```javascript
pm.test("Shift data is valid", function () {
    var jsonData = pm.response.json();
    var shift = jsonData.data.shift;
    
    pm.expect(shift).to.have.property('_id');
    pm.expect(shift).to.have.property('shiftId');
    pm.expect(shift).to.have.property('status');
    pm.expect(shift).to.have.property('serviceTypeId');
    pm.expect(shift.status).to.equal('pending');
});
```

**Timesheet Data Validation:**
```javascript
pm.test("Timesheet data is valid", function () {
    var jsonData = pm.response.json();
    var timesheet = jsonData.data.timesheet;
    
    pm.expect(timesheet).to.have.property('_id');
    pm.expect(timesheet).to.have.property('shiftId');
    pm.expect(timesheet).to.have.property('status');
    pm.expect(timesheet).to.have.property('workerId');
    pm.expect(timesheet.status).to.equal('submitted');
});
```

---

This comprehensive guide provides all the necessary sample data and test cases for testing the Support24 API's shift and timesheet workflows. Make sure to follow the sequence of operations for the best testing experience. 