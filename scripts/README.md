# Scripts Directory

This directory contains one-time utility scripts for database operations and maintenance.

## Available Scripts

### 1. Location Data Cleanup

**File:** `cleanup-locations.ts`

**Purpose:** Drops all location-related collections to allow clean re-seeding.

**Usage:**
```bash
npm run cleanup:locations
```

**What it does:**
1. Connects to MongoDB
2. Drops the following collections:
   - `states`
   - `regions`
   - `suburbs`
   - `serviceareas`
3. Disconnects and exits

**When to use:**
- Before re-running location seeds after schema changes
- To clean up test/development data
- When you need to start fresh with location data

---

### 2. Location Data Seeder

**File:** `seed-locations.ts`

**Purpose:** Seeds the database with Australian location reference data including:
- 8 States and Territories
- 25+ Major Regions
- 20+ Sample Suburbs with GPS coordinates
- 15+ Service Areas

**Usage:**
```bash
npm run seed:locations
```

**Or directly:**
```bash
ts-node scripts/seed-locations.ts
```

**What it does:**
1. Connects to MongoDB
2. Seeds Australian states and territories
3. Seeds major regions for each state
4. Seeds sample suburbs with real coordinates
5. Seeds service areas for each region
6. Disconnects and exits

**Note:** The script is idempotent - it checks if data already exists before creating new records, so it's safe to run multiple times.

**Expected Output:**
```
🌏 LOCATION DATA SEEDER
📡 Connecting to MongoDB...
✓ Connected to MongoDB successfully

🚀 Starting location data seeding...
Seeding Australian states...
Created state: New South Wales
Created state: Victoria
...
Seeded 8 states

Seeding Australian regions...
Created region: Greater Sydney
Created region: Greater Melbourne
...
Seeded 25 regions

Seeding sample suburbs...
Created suburb: Sydney CBD, 2000
Created suburb: Melbourne CBD, 3000
...
Seeded 20 suburbs

Seeding service areas...
Created service area: Sydney Inner West
Created service area: Melbourne Inner City
...
Service areas seeded successfully

✅ LOCATION DATA SEEDING COMPLETED SUCCESSFULLY!

Seeded data includes:
  • 8 Australian States and Territories
  • 25+ Major Regions
  • 20+ Sample Suburbs with GPS coordinates
  • 15+ Service Areas
```

---

### 3. Partial GeoJSON Cleanup

**File:** `cleanup-partial-geojson.ts`

**Purpose:** Removes incomplete GeoJSON objects from existing participants and workers. This is a migration script to fix data from the old schema where GeoJSON fields could have `type: "Point"` without coordinates.

**Usage:**
```bash
npm run cleanup:geojson
```

**What it does:**
1. Connects to MongoDB
2. Finds all participants with partial `participantLocation` (type exists but no coordinates)
3. Finds all workers with partial `baseLocation` (type exists but no coordinates)
4. Removes these incomplete GeoJSON fields completely
5. Prevents MongoDB 2dsphere index errors

**When to use:**
- After upgrading to the new location schema
- If you encounter "Point must be an array or object" errors
- When existing users have incomplete location data

**Expected Output:**
```
🚀 STARTING GEOJSON CLEANUP
✅ Connected to MongoDB

🔧 Cleaning up participant GeoJSON data...
📊 Found 5 participants with partial GeoJSON
✅ Cleaned up 5 participants

🔧 Cleaning up worker GeoJSON data...
📊 Found 3 workers with partial GeoJSON
✅ Cleaned up 3 workers

✅ GEOJSON CLEANUP COMPLETED SUCCESSFULLY
```

**Note:** This script is safe to run multiple times and won't affect users with complete location data.

---

### 4. Service Categories and Types - Cleanup and Seed

**File:** `cleanup-and-seed-services.ts`

**Purpose:** Completely refreshes the service categories and service types data by:
- Cleaning up all existing service types and categories
- Seeding fresh data with proper relationships
- Verifying data integrity

**Usage:**
```bash
npm run seed:services
```

**Or directly:**
```bash
ts-node scripts/cleanup-and-seed-services.ts
```

**What it does:**
1. Connects to MongoDB
2. **Cleans up existing data:**
   - Deletes all existing ServiceType documents
   - Deletes all existing ServiceCategory documents
3. **Seeds fresh data:**
   - Creates 7 main service categories
   - Creates 35+ service types with proper category relationships
   - Establishes bidirectional references between categories and types
4. **Verifies data integrity:**
   - Checks all references are correctly linked
   - Validates category-to-type relationships
5. Displays a summary of seeded data
6. Disconnects and exits

**What's seeded:**
- **Assistance with Daily Life (Core)** - 8 service types
- **Community & Social Participation** - 4 service types
- **Transport & Travel Support** - 3 service types
- **Household & Domestic Support** - 4 service types
- **Capacity Building, Therapy & Daily Living Skills** - 4 service types
- **Supported / Shared Living & Group / Centre-Based Supports** - 4 service types
- **Assistive Technology (AT), Consumables & Equipment Support** - 4 service types

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Service Categories & Types - Cleanup and Seed Script     ║
╚════════════════════════════════════════════════════════════╝

✓ MongoDB connected successfully

=== Starting cleanup of existing data ===
Found 10 service types and 5 service categories
✓ Deleted 10 service types
✓ Deleted 5 service categories
=== Cleanup completed successfully ===

=== Starting seed process ===
Starting service categories and types seeding...
Processing category: Assistance with Daily Life (Core)
Created category: Assistance with Daily Life (Core) (64a5b2c...)
  - Created service type: Personal Care (PERSONAL_CARE)
  - Created service type: Community Access (COMMUNITY_ACCESS)
  ...
✓ Successfully seeded 7 categories and 35 service types

=== Verifying data integrity ===
Category: Assistance with Daily Life (Core)
  - SubCategories count: 8
✓ All seed data verified successfully

=== Seed Summary ===
Total Categories: 7
Total Service Types: 35

📁 Assistance with Daily Life (Core)
   Description: This is one of the most used and highest-billing areas.
   Service Types: 8
      - Personal Care (PERSONAL_CARE)
      - Community Access (COMMUNITY_ACCESS)
      ...

╔════════════════════════════════════════════════════════════╗
║              ✓ Script completed successfully!              ║
╚════════════════════════════════════════════════════════════╝
```

**When to use:**
- Initial setup of service categories and types
- After making changes to service categories schema
- To refresh service data to match current business requirements
- When service types need to be reorganized

**⚠️ WARNING:**
This script will **DELETE ALL** existing service types and categories. Make sure you have a backup if you have important data that shouldn't be lost.

**Note:** This script is idempotent in the sense that running it multiple times will produce the same result, but it will delete and recreate all data each time.

---

## Workflow

Typical workflow for location setup and maintenance:

1. **Initial Setup:**
   ```bash
   npm run seed:locations
   ```

2. **Fix Existing User Data** (for existing applications):
   ```bash
   npm run cleanup:geojson
   ```

3. **Reset and Re-seed** (if needed):
   ```bash
   npm run cleanup:locations
   npm run seed:locations
   ```

---

## Future Scripts

Add new scripts here as needed for:
- Data migrations
- Database cleanup
- One-time updates
- Testing data generation

