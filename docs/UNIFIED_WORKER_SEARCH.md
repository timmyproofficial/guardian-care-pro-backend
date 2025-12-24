# Unified Worker Search Implementation

## Overview

Successfully merged location-based and general worker search into a single unified endpoint at `GET /api/v1/workers/search`.

## What Changed

### 1. Service Layer (`src/services/worker-search.service.ts`)

**Enhanced `searchWorkers()` function:**
- Added optional `locationFilters` parameter supporting:
  - `stateId` - Search workers in a specific state
  - `regionId` - Search workers in a specific region
  - `serviceAreaId` - Search workers in a specific service area
  - `matchParticipantLocation` - Auto-match participant's location

**Key Features:**
- Location filters use MongoDB `$or` to match workers in ANY of the participant's location areas
- Properly merges location `$or` with keyword search `$or` using `$and`
- Conditionally includes and populates location fields only when needed
- Fully backward compatible - existing searches work unchanged

### 2. Controller Layer (`src/controllers/worker-search.controller.ts`)

**Enhanced `searchWorkers` controller:**
- Extracts location query parameters
- Builds `locationFilters` object when any location param is provided
- Passes location filters to service layer
- Automatically uses authenticated participant's ID (no need to pass participantId in query)

### 3. Route Documentation (`src/routes/worker.route.ts`)

**Updated route documentation:**
- Added location filter query parameters
- Included examples for various use cases
- Clarified that participantId is extracted from auth token

## API Usage

### Endpoint
```
GET /api/v1/workers/search
```

### Authentication
**Required:** Bearer token (Participant role only)

### Query Parameters

#### Location Filters (NEW)
| Parameter | Type | Description |
|-----------|------|-------------|
| `stateId` | string | ObjectId of state |
| `regionId` | string | ObjectId of region |
| `serviceAreaId` | string | ObjectId of service area |
| `matchParticipantLocation` | boolean | Auto-match participant's location |

#### General Filters (Existing)
| Parameter | Type | Description |
|-----------|------|-------------|
| `skills[]` | string[] | Array of skill ObjectIds |
| `serviceAreas[]` | string[] | Array of service area names |
| `languages[]` | string[] | Array of languages |
| `availabilityDays[]` | string[] | Array of day names |
| `availabilityStartTime` | string | Start time (HH:MM) |
| `availabilityEndTime` | string | End time (HH:MM) |
| `availabilityDate` | Date | Specific date |
| `minRating` | number | Minimum rating |
| `maxHourlyRate` | number | Maximum hourly rate |
| `onlyVerified` | boolean | Only verified workers |
| `keyword` | string | Search in name/bio |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 100) |

## Example Requests

### 1. General Search (Existing Functionality)
```bash
GET /api/v1/workers/search?skills[]=68649df68e1a442c4e36c8bf&languages[]=English&page=1&limit=10
```

### 2. Location-Only Search
```bash
# By state
GET /api/v1/workers/search?stateId=690b0a037ee1cac861cb22df

# By region
GET /api/v1/workers/search?regionId=690b0a067ee1cac861cb2315

# Auto-match participant's location
GET /api/v1/workers/search?matchParticipantLocation=true&page=1&limit=10
```

### 3. Combined Location + General Filters
```bash
# Region + skills + rating
GET /api/v1/workers/search?regionId=690b0a067ee1cac861cb2315&skills[]=68649df68e1a442c4e36c8bf&minRating=4&onlyVerified=true

# State + languages + hourly rate
GET /api/v1/workers/search?stateId=690b0a037ee1cac861cb22df&languages[]=English&maxHourlyRate=50

# Auto-match + skills + availability
GET /api/v1/workers/search?matchParticipantLocation=true&skills[]=68649df68e1a442c4e36c8bf&availabilityDays[]=monday&availabilityDays[]=tuesday
```

### 4. Location + Keyword Search
```bash
GET /api/v1/workers/search?regionId=690b0a067ee1cac861cb2315&keyword=experienced&page=1
```

## Response Format

```json
{
  "success": true,
  "message": "Workers retrieved successfully",
  "data": {
    "workers": [
      {
        "_id": "worker_id",
        "firstName": "John",
        "lastName": "Doe",
        "profileImage": "https://...",
        "skills": [
          {
            "_id": "skill_id",
            "name": "Personal Care",
            "code": "PC01"
          }
        ],
        "hourlyRate": {
          "baseRate": 45.50
        },
        "ratings": {
          "average": 4.5,
          "count": 20
        },
        "serviceAreas": ["Sydney", "Melbourne"],
        "languages": ["English", "Spanish"],
        "bio": "Experienced support worker...",
        "verificationStatus": {
          "profileSetupComplete": true,
          "identityVerified": true,
          "policeCheckVerified": true,
          "ndisWorkerScreeningVerified": true
        },
        "isInUserOrganization": false,
        // Location fields (only included when locationFilters are used)
        "stateIds": [
          {
            "_id": "state_id",
            "name": "New South Wales",
            "code": "NSW"
          }
        ],
        "regionIds": [
          {
            "_id": "region_id",
            "name": "Greater Sydney",
            "code": "GS"
          }
        ],
        "serviceAreaIds": [
          {
            "_id": "service_area_id",
            "name": "Sydney Inner West",
            "code": "SYD-IW"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 5,
      "totalResults": 47,
      "hasMore": true
    }
  }
}
```

## Technical Implementation Details

### Location Filtering Logic

When location filters are provided:

1. **Auto-match participant location** (`matchParticipantLocation=true`):
   - Fetches participant's `stateId`, `regionId`, `serviceAreaId`
   - Creates `$or` conditions: `{ $or: [{ stateIds: participantStateId }, { regionIds: participantRegionId }, { serviceAreaIds: participantServiceAreaId }] }`
   - Matches workers who work in ANY of these locations

2. **Manual location filters** (stateId, regionId, or serviceAreaId):
   - Creates `$or` conditions for provided filters
   - Workers match if they work in ANY of the specified locations

3. **Keyword + Location merge**:
   - If both keyword and location filters exist:
   - Uses `$and` to combine: `{ $and: [{ $or: locationConditions }, { $or: keywordConditions }] }`
   - Ensures workers match BOTH a location AND the keyword

### Performance Optimizations

- **Conditional field selection**: Location fields only included when needed
- **Conditional population**: Location references only populated when requested
- **Indexed queries**: Uses existing MongoDB indexes on `stateIds`, `regionIds`, `serviceAreaIds`
- **Lean queries**: Uses `.lean()` for faster, plain JavaScript objects

### Backward Compatibility

✅ **100% Backward Compatible**
- All existing searches work unchanged
- Location filters are optional
- No breaking changes to existing API contracts

## Migration Notes

### Optional: Deprecate Old Endpoints

After verifying the unified endpoint works correctly, consider deprecating:

1. **`GET /api/v1/location/workers/by-region`** - Now redundant
2. **`GET /api/v1/location/workers/nearby`** - Proximity search (keep for now, different use case)

### Recommended Migration Steps

1. ✅ Deploy unified endpoint
2. Update frontend to use new location parameters
3. Monitor usage of old `/location/workers/by-region` endpoint
4. After migration period, mark as deprecated
5. Eventually remove deprecated endpoint

## Testing Checklist

- [x] General search without location filters works
- [x] Search by stateId only
- [x] Search by regionId only
- [x] Search by serviceAreaId only
- [x] matchParticipantLocation=true works
- [x] Combined location + skills filters
- [x] Combined location + languages filters
- [x] Combined location + rating filters
- [x] Combined location + availability filters
- [x] Location + keyword search properly merges $or conditions
- [x] Pagination works with location filters
- [x] Location fields only included when filters are used
- [x] Backward compatibility maintained

## Benefits

✅ **Single Unified Endpoint** - One endpoint for all worker searches
✅ **Flexible Filtering** - Combine location with any other filter
✅ **Better UX** - Users don't need to choose between endpoints
✅ **Cleaner API** - Reduced API surface area
✅ **Better Performance** - Conditional field selection
✅ **Backward Compatible** - No breaking changes
✅ **Type Safe** - Full TypeScript support
✅ **Well Documented** - Clear examples and usage

## Implementation Date

**Completed:** November 10, 2025

## Files Modified

1. `src/services/worker-search.service.ts` - Enhanced searchWorkers() function
2. `src/controllers/worker-search.controller.ts` - Updated controller method
3. `src/routes/worker.route.ts` - Updated documentation

## Related Documentation

- [Location Models](../src/models/location/README.md)
- [Worker Search Service](../src/services/worker-search.service.ts)
- [API Routes](../src/routes/worker.route.ts)

