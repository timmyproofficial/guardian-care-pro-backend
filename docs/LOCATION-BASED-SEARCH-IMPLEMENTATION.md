# Location-Based Search Implementation Guide

## Overview

This document describes the location-based search and geospatial features implemented for the Guardian Care Pro API. The system supports Australia-wide location management and enables participants to find support workers based on geographic proximity and regional matching.

## Table of Contents

1. [Architecture](#architecture)
2. [Models](#models)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Database Seeding](#database-seeding)
6. [Query Performance](#query-performance)
7. [Future Enhancements](#future-enhancements)

---

## Architecture

The location-based system consists of:

- **Reference Data Models**: State, Region, Suburb, ServiceArea
- **User Location Extensions**: Participant and Worker models extended with location fields
- **Geospatial Indexes**: 2dsphere indexes for efficient proximity searches
- **Search Services**: Optimized search functions for nearby and regional matching

### Data Hierarchy

```
Country (Australia)
└── State (NSW, VIC, QLD, etc.)
    └── Region (Greater Sydney, Greater Melbourne, etc.)
        └── Suburb (Sydney CBD, Parramatta, etc.)
        └── ServiceArea (Sydney Inner West, Melbourne Bayside, etc.)
```

---

## Models

### 1. State Model (`src/models/location/state.model.ts`)

Represents Australian states and territories.

```typescript
{
  name: string;           // "New South Wales"
  code: string;           // "NSW"
  country: string;        // "Australia"
  isActive: boolean;
}
```

### 2. Region Model (`src/models/location/region.model.ts`)

Represents regions within states (e.g., Greater Sydney, Greater Melbourne).

```typescript
{
  name: string;           // "Greater Sydney"
  code: string;           // "GSYD"
  stateId: ObjectId;      // Reference to State
  description?: string;
  isActive: boolean;
}
```

### 3. Suburb Model (`src/models/location/suburb.model.ts`)

Represents suburbs with optional GeoJSON coordinates.

```typescript
{
  name: string;           // "Sydney CBD"
  postcode: string;       // "2000"
  regionId: ObjectId;
  stateId: ObjectId;
  location?: {            // GeoJSON Point
    type: 'Point';
    coordinates: [lng, lat];  // [151.2093, -33.8688]
  };
  isActive: boolean;
}
```

**Indexes**: 2dsphere index on `location` for geospatial queries.

### 4. ServiceArea Model (`src/models/location/serviceArea.model.ts`)

Defines service coverage areas for workers.

```typescript
{
  name: string;           // "Sydney Inner West"
  code: string;           // "SYD-IW"
  regionId: ObjectId;
  stateId: ObjectId;
  suburbIds: ObjectId[];
  description?: string;
  boundaryPolygon?: {     // Optional GeoJSON Polygon
    type: 'Polygon';
    coordinates: number[][][];
  };
  centerPoint?: {         // Optional center point
    type: 'Point';
    coordinates: [lng, lat];
  };
  isActive: boolean;
}
```

**Indexes**: 2dsphere indexes on `boundaryPolygon` and `centerPoint`.

### 5. Extended Participant Model

Added location fields for participants:

```typescript
{
  // ... existing fields
  stateId?: ObjectId;
  regionId?: ObjectId;
  suburbId?: ObjectId;
  serviceAreaId?: ObjectId;
  participantLocation?: {
    type: 'Point';
    coordinates: [lng, lat];
  };
  address?: {
    street?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  };
}
```

**Indexes**: 2dsphere index on `participantLocation`.

### 6. Extended Worker Model

Added location fields for workers:

```typescript
{
  // ... existing fields
  stateIds?: ObjectId[];        // Multiple states
  regionIds?: ObjectId[];       // Multiple regions
  serviceAreaIds?: ObjectId[];  // Multiple service areas
  baseLocation?: {
    type: 'Point';
    coordinates: [lng, lat];
  };
  travelRadiusKm?: number;      // Default: 20km
  baseAddress?: {
    street?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
  };
}
```

**Indexes**: 2dsphere index on `baseLocation`.

---

## API Endpoints

### Location Reference Data

#### Get All States
```http
GET /api/v1/location/states
Authorization: Bearer {token}
```

**Response**:
```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "New South Wales", "code": "NSW" },
    { "_id": "...", "name": "Victoria", "code": "VIC" }
  ]
}
```

#### Get Regions by State
```http
GET /api/v1/location/regions/:stateId
Authorization: Bearer {token}
```

#### Get Suburbs by Region
```http
GET /api/v1/location/suburbs/region/:regionId
Authorization: Bearer {token}
```

#### Get Suburbs by State
```http
GET /api/v1/location/suburbs/state/:stateId
Authorization: Bearer {token}
```

#### Search Suburbs
```http
GET /api/v1/location/suburbs/search?query=Sydney&stateId={stateId}&limit=20
Authorization: Bearer {token}
```

**Query Parameters**:
- `query` (required): Search term (name or postcode)
- `stateId` (optional): Filter by state
- `limit` (optional): Max results (default: 20)

#### Get Service Areas by Region
```http
GET /api/v1/location/service-areas/region/:regionId
Authorization: Bearer {token}
```

#### Get Service Areas by State
```http
GET /api/v1/location/service-areas/state/:stateId
Authorization: Bearer {token}
```

#### Get All Service Areas
```http
GET /api/v1/location/service-areas
Authorization: Bearer {token}
```

#### Get Location Hierarchy
```http
GET /api/v1/location/hierarchy/:suburbId
Authorization: Bearer {token}
```

Returns complete hierarchy (suburb, region, state, service areas).

#### Geocode Address
```http
POST /api/v1/location/geocode
Authorization: Bearer {token}
Content-Type: application/json

{
  "street": "123 Main St",
  "suburb": "Sydney",
  "postcode": "2000",
  "state": "NSW"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "longitude": 151.2093,
    "latitude": -33.8688
  }
}
```

---

### Geospatial Worker Search

#### Search Workers Nearby (Geospatial)
```http
GET /api/v1/location/workers/nearby
Authorization: Bearer {token}
```

**Query Parameters**:
- `participantId` (required): Participant's ID
- `maxDistanceKm` (optional): Maximum search radius in km (default: 50)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `skills[]` (optional): Array of skill/service type IDs
- `languages[]` (optional): Array of languages
- `minRating` (optional): Minimum rating (0-5)
- `maxHourlyRate` (optional): Maximum hourly rate
- `onlyVerified` (optional): Only verified workers (true/false)
- `keyword` (optional): Search in name/bio

**Example**:
```http
GET /api/v1/location/workers/nearby?participantId=123&maxDistanceKm=30&skills[]=skill1&skills[]=skill2&minRating=4&page=1&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "_id": "...",
        "firstName": "John",
        "lastName": "Smith",
        "profileImage": "https://...",
        "skills": [
          { "_id": "...", "name": "Personal Care", "code": "PC" }
        ],
        "hourlyRate": { "baseRate": 45 },
        "ratings": { "average": 4.5, "count": 20 },
        "serviceAreas": ["2000", "2010"],
        "languages": ["English", "Spanish"],
        "bio": "Experienced support worker...",
        "verificationStatus": { ... },
        "isInUserOrganization": false,
        "distanceKm": 12.5
      }
    ],
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "totalResults": 25,
    "hasMore": true
  }
}
```

**How it works**:
1. Uses MongoDB's `$geoNear` aggregation for efficient geospatial queries
2. Finds workers within their specified `travelRadiusKm` of the participant
3. Results sorted by distance (closest first), then by rating
4. Returns distance in kilometers for each worker

#### Search Workers by Region
```http
GET /api/v1/location/workers/by-region
Authorization: Bearer {token}
```

**Query Parameters**:
- `participantId` (required): Participant's ID
- **Location Filters** (at least one required):
  - `stateId`: Filter by state
  - `regionId`: Filter by region
  - `serviceAreaId`: Filter by service area
  - `matchParticipantLocation`: Auto-match participant's location (true/false)
- `page`, `limit`: Pagination
- Standard filters: `skills[]`, `languages[]`, `minRating`, `maxHourlyRate`, `onlyVerified`, `keyword`

**Example 1 - By Region**:
```http
GET /api/v1/location/workers/by-region?participantId=123&regionId=456&skills[]=skill1&page=1&limit=10
```

**Example 2 - Auto-match Participant's Location**:
```http
GET /api/v1/location/workers/by-region?participantId=123&matchParticipantLocation=true&minRating=4&page=1
```

**How it works**:
1. If `matchParticipantLocation=true`: Automatically finds workers in the same state/region/service area as the participant
2. Otherwise: Filters by specified location IDs
3. Uses `$or` operator to match workers serving any of the relevant location areas
4. Results sorted by rating and hourly rate

---

## Usage Examples

### 1. Participant Onboarding with Location

```typescript
POST /api/v1/users/participant/:participantId/onboarding
Content-Type: application/json

{
  "supportNeeds": ["serviceType1", "serviceType2"],
  "emergencyContact": { ... },
  "stateId": "stateObjectId",
  "regionId": "regionObjectId",
  "suburbId": "suburbObjectId",
  "serviceAreaId": "serviceAreaObjectId",
  "location": {
    "longitude": 151.2093,
    "latitude": -33.8688
  },
  "address": {
    "street": "123 Main St",
    "suburb": "Sydney",
    "postcode": "2000",
    "state": "NSW"
  }
}
```

### 2. Worker Onboarding with Location

```typescript
POST /api/v1/users/worker/:workerId/onboarding
Content-Type: application/json

{
  "bio": "Experienced support worker...",
  "skills": ["skill1", "skill2"],
  "languages": ["English", "Spanish"],
  "shiftRates": [ ... ],
  "availability": { ... },
  "stateIds": ["state1", "state2"],
  "regionIds": ["region1", "region2"],
  "serviceAreaIds": ["area1", "area2"],
  "baseLocation": {
    "longitude": 151.2093,
    "latitude": -33.8688
  },
  "travelRadiusKm": 25,
  "baseAddress": {
    "street": "456 Worker St",
    "suburb": "Parramatta",
    "postcode": "2150",
    "state": "NSW"
  }
}
```

### 3. Find Workers Near Participant

```javascript
// Frontend example
const findNearbyWorkers = async (participantId) => {
  const response = await fetch(
    `/api/v1/location/workers/nearby?participantId=${participantId}&maxDistanceKm=30&page=1&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const { data } = await response.json();
  
  // Display workers with distance
  data.workers.forEach(worker => {
    console.log(`${worker.firstName} - ${worker.distanceKm}km away`);
  });
};
```

### 4. Find Workers in Same Region

```javascript
const findRegionalWorkers = async (participantId) => {
  const response = await fetch(
    `/api/v1/location/workers/by-region?participantId=${participantId}&matchParticipantLocation=true&onlyVerified=true`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const { data } = await response.json();
  return data.workers;
};
```

---

## Database Seeding

### Seed Location Data

Run the seed function to populate Australian states, regions, suburbs, and service areas:

```typescript
import { seedLocationData } from './src/seed/location.seed';

// In your seed script or server initialization
await seedLocationData();
```

**What gets seeded**:
- 8 Australian states and territories
- 25+ major regions across Australia
- 20+ sample suburbs with coordinates
- 15+ service areas

### Sample Data Included

**States**: NSW, VIC, QLD, WA, SA, TAS, ACT, NT

**Major Regions**:
- NSW: Greater Sydney, Hunter Region, Illawarra, Central Coast, Northern Rivers
- VIC: Greater Melbourne, Geelong, Ballarat, Bendigo, Gippsland
- QLD: Greater Brisbane, Gold Coast, Sunshine Coast, Cairns, Townsville
- And more...

**Sample Suburbs**:
- Sydney CBD (2000), Parramatta (2150), Bondi (2026)
- Melbourne CBD (3000), Carlton (3053), St Kilda (3182)
- Brisbane CBD (4000), Perth CBD (6000), Adelaide CBD (5000)
- And more...

---

## Query Performance

### Indexes

All location models have appropriate indexes for fast queries:

1. **State**: `code`, `name`, `isActive`
2. **Region**: `stateId + code` (unique), `stateId + isActive`, `name`
3. **Suburb**: `regionId + isActive`, `stateId + isActive`, `postcode + stateId`, `location` (2dsphere)
4. **ServiceArea**: `regionId + code` (unique), `stateId + isActive`, `boundaryPolygon` (2dsphere), `centerPoint` (2dsphere)
5. **Participant**: `participantLocation` (2dsphere), `stateId`, `regionId`, `suburbId`, `serviceAreaId`
6. **Worker**: `baseLocation` (2dsphere), `stateIds`, `regionIds`, `serviceAreaIds`, `travelRadiusKm`

### Geospatial Query Optimization

**Nearby Search**:
- Uses `$geoNear` aggregation (must be first stage in pipeline)
- 2dsphere index enables spherical geometry calculations
- Filters by worker's `travelRadiusKm` to respect their service boundaries
- Returns actual distance for each result

**Region Search**:
- Uses indexed `$in` queries on location arrays
- `$or` operator combines multiple location criteria
- Standard B-tree indexes for fast categorical lookups

### Performance Tips

1. **Always specify coordinates** for participants and workers during onboarding for best geospatial results
2. **Use pagination** - limit results to 10-20 per page
3. **Combine filters** - More specific queries = faster results
4. **Cache reference data** - States, regions, suburbs rarely change

---

## Future Enhancements

### Planned Features

1. **External Geocoding Integration**
   - Integrate Google Maps Geocoding API
   - Automatic coordinate lookup from addresses
   - Address validation and standardization

2. **Advanced Geospatial Features**
   - Polygon-based service areas (draw on map)
   - `$geoWithin` queries for polygon matching
   - Route-based distance (vs. straight-line distance)

3. **Location-Based Notifications**
   - Notify workers when new shifts available in their area
   - Alert participants about workers joining their region

4. **Heat Maps**
   - Show worker density by region
   - Identify underserved areas

5. **Multi-Country Support**
   - Extend beyond Australia
   - Add country-specific location hierarchies
   - Support different address formats

6. **Location History**
   - Track worker service locations over time
   - Participant move history

### Extensibility

The current implementation is designed for flexibility:

- **Modular structure**: Location models in separate directory
- **Country field**: Ready for multi-country expansion
- **Optional fields**: Most location fields are optional for gradual adoption
- **GeoJSON standard**: Compatible with mapping libraries (Leaflet, Mapbox, Google Maps)

---

## Sample Queries

### MongoDB Query Examples

#### Find suburbs within 10km of coordinates
```javascript
db.suburbs.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [151.2093, -33.8688]
      },
      $maxDistance: 10000  // meters
    }
  }
})
```

#### Find workers serving a specific region
```javascript
db.users.find({
  role: "supportWorker",
  regionIds: ObjectId("regionId"),
  "verificationStatus.onboardingComplete": true
})
```

#### Find workers within travel radius of a point
```javascript
db.users.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [151.2093, -33.8688] },
      distanceField: "distance",
      spherical: true,
      key: "baseLocation"
    }
  },
  {
    $match: {
      $expr: { $lte: ["$distance", { $multiply: ["$travelRadiusKm", 1000] }] }
    }
  }
])
```

---

## Testing

### Test Scenarios

1. **Onboarding Tests**
   - Participant with location data
   - Worker with multiple regions
   - Missing optional location fields

2. **Search Tests**
   - Nearby search with various radii
   - Region matching (same state, region, service area)
   - Combined filters (location + skills + rating)
   - Pagination

3. **Reference Data Tests**
   - Fetch states, regions, suburbs
   - Search suburbs by name/postcode
   - Get location hierarchy

4. **Edge Cases**
   - Participant without location coordinates
   - Worker with no base location
   - Empty search results
   - Invalid location IDs

---

## Support

For questions or issues related to location-based search:

1. Check this documentation
2. Review the code comments in:
   - `src/models/location/`
   - `src/services/location.service.ts`
   - `src/services/worker-search.service.ts`
   - `src/controllers/location.controller.ts`
3. Check MongoDB 2dsphere index documentation
4. Test with sample data using the seed scripts

---

## Summary

This implementation provides a comprehensive location-based search system for Guardian Care Pro, enabling:

✅ Hierarchical location data (State → Region → Suburb → ServiceArea)  
✅ GeoJSON Point storage with 2dsphere indexes  
✅ Geospatial proximity search (find workers nearby)  
✅ Categorical regional search (find workers by state/region)  
✅ Flexible worker service areas (multiple regions, custom travel radius)  
✅ Optimized queries with proper indexing  
✅ Australia-wide support with extensibility for future countries  
✅ RESTful API endpoints with comprehensive filtering  

The system is production-ready, scalable, and follows MongoDB best practices for geospatial data.

