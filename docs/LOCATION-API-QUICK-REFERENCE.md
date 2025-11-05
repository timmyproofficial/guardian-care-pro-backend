# Location-Based Search API - Quick Reference

## Quick Start

### 1. Seed Location Data

Before using the location features, seed the database with Australian location data:

```typescript
import { seedLocationData } from './src/seed/location.seed';

// Run once on server startup or via migration script
await seedLocationData();
```

### 2. Participant Onboarding with Location

```http
POST /api/users/participant/:participantId/onboarding
Authorization: Bearer {token}
Content-Type: application/json

{
  "supportNeeds": ["serviceTypeId1", "serviceTypeId2"],
  "emergencyContact": {
    "name": "John Doe",
    "relationship": "Father",
    "phone": "+61412345678"
  },
  "preferredLanguages": ["English"],
  "ndisNumber": "123456789",
  
  // Location fields (all optional)
  "stateId": "6742abc123def456",
  "regionId": "6742def789abc123",
  "suburbId": "6742ghi456def789",
  "serviceAreaId": "6742jkl123ghi456",
  "location": {
    "longitude": 151.2093,
    "latitude": -33.8688
  },
  "address": {
    "street": "123 Main Street",
    "suburb": "Sydney",
    "postcode": "2000",
    "state": "NSW"
  }
}
```

### 3. Worker Onboarding with Location

```http
POST /api/users/worker/:workerId/onboarding
Authorization: Bearer {token}
Content-Type: application/json

{
  "bio": "Experienced support worker with 5 years in NDIS sector",
  "skills": ["skillId1", "skillId2"],
  "languages": ["English", "Mandarin"],
  "shiftRates": [
    {
      "rateTimeBandId": "rateTimeBandId1",
      "hourlyRate": 45
    }
  ],
  "availability": {
    "weekdays": [
      {
        "day": "monday",
        "available": true,
        "slots": [
          { "start": "09:00", "end": "17:00" }
        ]
      }
    ],
    "unavailableDates": []
  },
  
  // Location fields (all optional)
  "stateIds": ["stateId1", "stateId2"],
  "regionIds": ["regionId1", "regionId2"],
  "serviceAreaIds": ["serviceAreaId1", "serviceAreaId2"],
  "baseLocation": {
    "longitude": 151.0042,
    "latitude": -33.8151
  },
  "travelRadiusKm": 25,
  "baseAddress": {
    "street": "456 Worker Avenue",
    "suburb": "Parramatta",
    "postcode": "2150",
    "state": "NSW"
  }
}
```

---

## Location Reference Endpoints

### Get States
```http
GET /api/location/states
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "New South Wales", "code": "NSW" },
    { "_id": "...", "name": "Victoria", "code": "VIC" }
  ]
}
```

### Get Regions by State
```http
GET /api/location/regions/{stateId}
Authorization: Bearer {token}
```

### Get Suburbs by Region
```http
GET /api/location/suburbs/region/{regionId}
Authorization: Bearer {token}
```

### Search Suburbs
```http
GET /api/location/suburbs/search?query=Sydney&stateId={stateId}
Authorization: Bearer {token}
```

### Get Service Areas
```http
GET /api/location/service-areas
Authorization: Bearer {token}
```

### Geocode Address
```http
POST /api/location/geocode
Authorization: Bearer {token}
Content-Type: application/json

{
  "suburb": "Sydney",
  "postcode": "2000",
  "state": "NSW"
}
```

---

## Worker Search Endpoints

### 1. Find Workers Nearby (Geospatial)

**Best for:** Finding workers within physical proximity

```http
GET /api/location/workers/nearby?participantId={id}&maxDistanceKm=30&skills[]={skillId}&page=1&limit=10
Authorization: Bearer {token}
```

**Query Parameters:**
- `participantId` (required) - Participant's ID
- `maxDistanceKm` (optional, default: 50) - Search radius
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Results per page
- `skills[]` (optional) - Filter by skills
- `languages[]` (optional) - Filter by languages
- `minRating` (optional) - Minimum rating (0-5)
- `maxHourlyRate` (optional) - Maximum hourly rate
- `onlyVerified` (optional) - Only verified workers (true/false)
- `keyword` (optional) - Search in name/bio

**Example:**
```http
GET /api/location/workers/nearby?participantId=123abc&maxDistanceKm=20&skills[]=skill1&minRating=4&onlyVerified=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "_id": "worker123",
        "firstName": "Jane",
        "lastName": "Smith",
        "profileImage": "https://...",
        "skills": [
          { "_id": "skill1", "name": "Personal Care", "code": "PC" }
        ],
        "hourlyRate": { "baseRate": 45 },
        "ratings": { "average": 4.5, "count": 20 },
        "distanceKm": 12.5,
        "languages": ["English", "Spanish"],
        "verificationStatus": {
          "profileSetupComplete": true,
          "identityVerified": true,
          "policeCheckVerified": true,
          "ndisWorkerScreeningVerified": true
        }
      }
    ],
    "page": 1,
    "limit": 10,
    "totalPages": 2,
    "totalResults": 15,
    "hasMore": true
  }
}
```

### 2. Find Workers by Region

**Best for:** Finding workers in same state/region/service area

```http
GET /api/location/workers/by-region?participantId={id}&regionId={regionId}&page=1
Authorization: Bearer {token}
```

**Query Parameters:**
- `participantId` (required) - Participant's ID
- **Location Filters** (at least one):
  - `stateId` - Filter by state
  - `regionId` - Filter by region
  - `serviceAreaId` - Filter by service area
  - `matchParticipantLocation=true` - Auto-match participant's location
- Standard filters: `skills[]`, `languages[]`, `minRating`, `maxHourlyRate`, `onlyVerified`, `keyword`
- Pagination: `page`, `limit`

**Example 1 - By Region:**
```http
GET /api/location/workers/by-region?participantId=123&regionId=456&skills[]=skill1
```

**Example 2 - Auto-match:**
```http
GET /api/location/workers/by-region?participantId=123&matchParticipantLocation=true&onlyVerified=true
```

**Response:** Same structure as nearby search (without `distanceKm` field)

---

## Common Use Cases

### Case 1: Dropdown Population (Frontend)

**Get States for Dropdown:**
```javascript
const states = await fetch('/api/location/states', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

**Get Regions when State Selected:**
```javascript
const regions = await fetch(`/api/location/regions/${selectedStateId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

**Get Suburbs when Region Selected:**
```javascript
const suburbs = await fetch(`/api/location/suburbs/region/${selectedRegionId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

### Case 2: Search Workers Near Participant

```javascript
const findNearbyWorkers = async (participantId, filters = {}) => {
  const params = new URLSearchParams({
    participantId,
    maxDistanceKm: filters.maxDistance || 30,
    page: filters.page || 1,
    limit: 10,
    ...(filters.skills && { 'skills[]': filters.skills }),
    ...(filters.minRating && { minRating: filters.minRating })
  });

  const response = await fetch(`/api/location/workers/nearby?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return await response.json();
};

// Usage
const result = await findNearbyWorkers('participant123', {
  maxDistance: 25,
  skills: ['skill1', 'skill2'],
  minRating: 4
});

result.data.workers.forEach(worker => {
  console.log(`${worker.firstName} - ${worker.distanceKm}km away`);
});
```

### Case 3: Search Workers in Same Region

```javascript
const findRegionalWorkers = async (participantId) => {
  const response = await fetch(
    `/api/location/workers/by-region?participantId=${participantId}&matchParticipantLocation=true&onlyVerified=true`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  return await response.json();
};
```

---

## Response Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing/invalid token
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Tips & Best Practices

1. **Always provide coordinates** during onboarding for best geospatial results
2. **Use pagination** - Limit to 10-20 results per page for performance
3. **Cache location reference data** - States/regions rarely change
4. **Combine filters** - More specific queries = faster, better results
5. **Handle empty results** - Not all areas may have workers
6. **Distance sorting** - Nearby search returns closest workers first
7. **Verify workers** - Use `onlyVerified=true` for quality assurance

---

## Error Handling

```javascript
try {
  const response = await fetch('/api/location/workers/nearby?participantId=123', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Handle error
    console.error(result.message);
  } else {
    // Handle success
    console.log(result.data);
  }
} catch (error) {
  // Handle network/parsing errors
  console.error('Request failed:', error);
}
```

---

## Sample Frontend Flow

### Participant Onboarding Form:

```javascript
// 1. Load states on form mount
const states = await fetch('/api/location/states').then(r => r.json());

// 2. When user selects state, load regions
const handleStateChange = async (stateId) => {
  const regions = await fetch(`/api/location/regions/${stateId}`).then(r => r.json());
  setRegions(regions.data);
};

// 3. When user selects region, load suburbs
const handleRegionChange = async (regionId) => {
  const suburbs = await fetch(`/api/location/suburbs/region/${regionId}`).then(r => r.json());
  setSuburbs(suburbs.data);
};

// 4. When user enters address, geocode it
const handleAddressComplete = async (address) => {
  const coords = await fetch('/api/location/geocode', {
    method: 'POST',
    body: JSON.stringify(address),
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json());
  
  setLocation(coords.data);
};

// 5. Submit onboarding with all data
const submitOnboarding = async (formData) => {
  await fetch(`/api/users/participant/${participantId}/onboarding`, {
    method: 'POST',
    body: JSON.stringify({
      ...formData,
      stateId: selectedState,
      regionId: selectedRegion,
      suburbId: selectedSuburb,
      location: geocodedLocation,
      address: enteredAddress
    }),
    headers: { 'Content-Type': 'application/json' }
  });
};
```

---

## MongoDB Query Examples

### Find workers within 20km of a point:
```javascript
db.users.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [151.2093, -33.8688] },
      distanceField: "distance",
      distanceMultiplier: 0.001,
      spherical: true,
      key: "baseLocation",
      query: { role: "supportWorker", status: "active" }
    }
  },
  {
    $match: {
      $expr: { $lte: ["$distance", "$travelRadiusKm"] }
    }
  }
])
```

### Find workers in a specific region:
```javascript
db.users.find({
  role: "supportWorker",
  regionIds: ObjectId("regionId"),
  "verificationStatus.onboardingComplete": true
})
```

---

## Testing Checklist

- [ ] Seed location data successfully
- [ ] Participant onboarding with location saves correctly
- [ ] Worker onboarding with location saves correctly
- [ ] States endpoint returns data
- [ ] Regions filtered by state
- [ ] Suburbs filtered by region
- [ ] Nearby search returns workers sorted by distance
- [ ] Region search matches participant location
- [ ] Filters work correctly (skills, rating, etc.)
- [ ] Pagination works
- [ ] Empty results handled gracefully
- [ ] Invalid IDs return proper errors

---

## Support & Resources

- **Full Documentation**: `docs/LOCATION-BASED-SEARCH-IMPLEMENTATION.md`
- **Models**: `src/models/location/`
- **Services**: `src/services/location.service.ts`, `src/services/worker-search.service.ts`
- **Controllers**: `src/controllers/location.controller.ts`
- **Routes**: `src/routes/location.route.ts`
- **Seed Data**: `src/seed/location.seed.ts`

---

## Need Help?

Common issues:
1. **"Participant location not found"** - Participant needs to complete onboarding with location data
2. **"No workers found"** - Try increasing `maxDistanceKm` or removing filters
3. **Empty dropdowns** - Run location seed script first
4. **Geocoding returns null** - Suburb not in database, use coordinates directly

For more help, check the full implementation guide or review the code comments.

