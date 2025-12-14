# ServiceCategory API Documentation

## Overview

The ServiceCategory API manages service categories within the Guardian Care Pro platform. ServiceCategories define the main groupings of support services, each containing multiple service types as subcategories. This provides a hierarchical structure for organizing support services.

## Authentication

All ServiceCategory endpoints require authentication via Bearer token:

```
Authorization: Bearer <your_access_token>
```

## Base URL

```
/api/service-categories
```

## Endpoints

### 1. Get All Service Categories

Retrieve all service categories with optional filtering and pagination.

**Endpoint:** `GET /api/service-categories`

**Authentication:** Required (All authenticated users)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (`active` or `inactive`) |
| name | string | No | Search by category name (case-insensitive) |
| page | number | No | Page number for pagination (default: 1) |
| limit | number | No | Number of items per page (default: 10, max: 100) |
| sortBy | string | No | Field to sort by (`name`, `code`, `status`, `createdAt`, `updatedAt`). Default: `createdAt` |
| sortOrder | string | No | Sort order (`asc` or `desc`). Default: `desc` |

**Request Example:**

```http
GET /api/service-categories?status=active&page=1&limit=20&sortBy=name&sortOrder=asc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "name": "Assistance with Daily Life (Core)",
        "status": "active",
        "description": "This is one of the most used and highest-billing areas.",
        "subCategories": [
          {
            "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
            "name": "Personal Care",
            "code": "PERSONAL_CARE",
            "category": "60f7b3b3b3b3b3b3b3b3b3b3",
            "status": "active",
            "createdAt": "2024-12-13T10:00:00.000Z",
            "updatedAt": "2024-12-13T10:00:00.000Z"
          },
          {
            "_id": "60f7b3b3b3b3b3b3b3b3b3b5",
            "name": "Community Access",
            "code": "COMMUNITY_ACCESS",
            "category": "60f7b3b3b3b3b3b3b3b3b3b3",
            "status": "active",
            "createdAt": "2024-12-13T10:00:00.000Z",
            "updatedAt": "2024-12-13T10:00:00.000Z"
          }
        ],
        "createdAt": "2024-12-13T10:00:00.000Z",
        "updatedAt": "2024-12-13T10:00:00.000Z"
      }
    ],
    "totalCount": 7,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

---

### 2. Get Service Category by ID

Retrieve a specific service category by its ID.

**Endpoint:** `GET /api/service-categories/:id`

**Authentication:** Required (All authenticated users)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId of the service category |

**Request Example:**

```http
GET /api/service-categories/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service category retrieved successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Assistance with Daily Life (Core)",
    "status": "active",
    "description": "This is one of the most used and highest-billing areas.",
    "subCategories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "name": "Personal Care",
        "code": "PERSONAL_CARE",
        "category": "60f7b3b3b3b3b3b3b3b3b3b3",
        "status": "active",
        "createdAt": "2024-12-13T10:00:00.000Z",
        "updatedAt": "2024-12-13T10:00:00.000Z"
      }
    ],
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T10:00:00.000Z"
  }
}
```

---

### 3. Get Service Categories by Status

Retrieve service categories filtered by status.

**Endpoint:** `GET /api/service-categories/status/:status`

**Authentication:** Required (All authenticated users)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | Yes | Category status (`active` or `inactive`) |

**Request Example:**

```http
GET /api/service-categories/status/active
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service categories retrieved successfully",
  "data": [
    {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "name": "Assistance with Daily Life (Core)",
      "status": "active",
      "description": "This is one of the most used and highest-billing areas.",
      "subCategories": [...],
      "createdAt": "2024-12-13T10:00:00.000Z",
      "updatedAt": "2024-12-13T10:00:00.000Z"
    }
  ]
}
```

---

### 4. Create Service Category

Create a new service category (Admin only).

**Endpoint:** `POST /api/service-categories`

**Authentication:** Required (Admin only)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Category name (max 100 characters) |
| code | string | Yes | Unique category code (uppercase, max 50 characters) |
| status | string | No | Status (`active` or `inactive`, defaults to `active`) |
| subCategories | array | Yes | Array of service type IDs (minimum 1 required) |

**Request Example:**

```http
POST /api/service-categories
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Assistive Technology Support",
  "code": "AT_SUPPORT",
  "status": "active",
  "subCategories": [
    "60f7b3b3b3b3b3b3b3b3b3b8",
    "60f7b3b3b3b3b3b3b3b3b3b9"
  ]
}
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service category created successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3c1",
    "name": "Assistive Technology Support",
    "status": "active",
    "subCategories": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b8",
        "name": "Low-Cost Assistive Technology",
        "code": "LOW_COST_AT",
        "category": "60f7b3b3b3b3b3b3b3b3b3c1",
        "status": "active",
        "createdAt": "2024-12-13T10:00:00.000Z",
        "updatedAt": "2024-12-13T10:00:00.000Z"
      }
    ],
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T10:00:00.000Z"
  }
}
```

---

### 5. Update Service Category

Update an existing service category (Admin only).

**Endpoint:** `PUT /api/service-categories/:id`

**Authentication:** Required (Admin only)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId of the service category |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Updated category name (max 100 characters) |
| code | string | No | Updated category code (uppercase, max 50 characters) |
| status | string | No | Updated status (`active` or `inactive`) |
| subCategories | array | No | Updated array of service type IDs (minimum 1 if provided) |

**Request Example:**

```http
PUT /api/service-categories/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Assistance with Daily Life",
  "status": "active",
  "subCategories": [
    "60f7b3b3b3b3b3b3b3b3b3b4",
    "60f7b3b3b3b3b3b3b3b3b3b5",
    "60f7b3b3b3b3b3b3b3b3b3b6"
  ]
}
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service category updated successfully",
  "data": {
    "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
    "name": "Assistance with Daily Life",
    "status": "active",
    "subCategories": [...],
    "createdAt": "2024-12-13T10:00:00.000Z",
    "updatedAt": "2024-12-13T11:30:00.000Z"
  }
}
```

---

### 6. Delete Service Category

Delete a service category (Admin only).

**Endpoint:** `DELETE /api/service-categories/:id`

**Authentication:** Required (Admin only)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | MongoDB ObjectId of the service category |

**Request Example:**

```http
DELETE /api/service-categories/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service category deleted successfully",
  "data": {}
}
```

---

### 7. Get Service Category Statistics

Get statistical data about service categories (Admin only).

**Endpoint:** `GET /api/service-categories/statistics`

**Authentication:** Required (Admin only)

**Request Example:**

```http
GET /api/service-categories/statistics
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Example:**

```json
{
  "success": true,
  "message": "Service category statistics retrieved successfully",
  "data": {
    "totalCategories": 7,
    "byStatus": {
      "active": 7,
      "inactive": 0
    },
    "totalSubCategories": 31
  }
}
```

---

## Data Models

### ServiceCategory

```typescript
{
  _id: ObjectId;                    // Unique identifier
  name: string;                     // Category name
  status: 'active' | 'inactive';    // Category status
  subCategories: ObjectId[];        // Array of ServiceType IDs
  description?: string;             // Optional description
  createdAt: Date;                  // Creation timestamp
  updatedAt: Date;                  // Last update timestamp
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid service category ID format"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Only admins can create service categories"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Service category not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Common Service Categories

The system comes pre-seeded with 7 main service categories:

1. **Assistance with Daily Life (Core)** - Personal care, community access, in-home support, etc.
2. **Community & Social Participation** - Community outings, social activities, companionship
3. **Transport & Travel Support** - Transport assistance, escort services, travel support
4. **Household & Domestic Support** - Household tasks, cleaning, meal preparation, gardening
5. **Capacity Building, Therapy & Daily Living Skills** - Life skills training, therapy, counselling
6. **Supported / Shared Living & Group / Centre-Based Supports** - SIL, group homes, day programs
7. **Assistive Technology (AT), Consumables & Equipment Support** - AT devices, consumables, equipment maintenance

---

## Notes

- Service categories are hierarchical containers for service types
- Each category must have at least one subcategory (service type)
- SubCategories are references to ServiceType documents via ObjectId
- Only administrators can create, update, or delete service categories
- All authenticated users can view service categories
- The `code` field must be unique across all categories
- Status can be `active` or `inactive` to control visibility
- Use the seed script (`npm run seed:services`) to populate initial data

---

## Related Endpoints

- [Service Types API](/docs/api/service-types.md) - Manage individual service types
- [Worker Onboarding API](/docs/api/users.md#worker-onboarding) - Workers select service categories
- [Participant Onboarding API](/docs/api/users.md#participant-onboarding) - Participants select service categories
