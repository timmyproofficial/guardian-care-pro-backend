# Service Categories and Types - Cleanup & Seed Script

## Overview

This document explains the new cleanup and seed script for managing Service Categories and Service Types in the Guardian Care Pro API.

## Script Location

**File:** `/scripts/cleanup-and-seed-services.ts`

**NPM Command:** `npm run seed:services`

## Purpose

The script provides a complete refresh mechanism for service categories and service types data by:
1. Cleaning up existing data (deleting all service types and categories)
2. Dropping problematic database indexes
3. Seeding fresh data with proper relationships
4. Verifying data integrity
5. Displaying a comprehensive summary

## What It Does

### 1. Database Connection
- Connects to MongoDB using the configuration from `config/env.ts`
- Uses the same connection string as the main application

### 2. Cleanup Phase
- Counts existing service types and categories
- Deletes all existing ServiceType documents
- Deletes all existing ServiceCategory documents
- **Drops all indexes** on both collections to prevent conflicts
  - This is especially important for the `code_1` unique index on ServiceCategory
  - The index was causing errors because the schema doesn't define a `code` field

### 3. Seeding Phase
- Creates **7 main service categories**:
  1. Assistance with Daily Life (Core)
  2. Community & Social Participation / Community Access
  3. Transport & Travel Support
  4. Household & Domestic Support
  5. Capacity Building, Therapy & Daily Living Skills
  6. Supported / Shared Living & Group / Centre-Based Supports
  7. Assistive Technology (AT), Consumables & Equipment Support

- Creates **31 service types** across all categories
- Establishes bidirectional references:
  - Each ServiceType has a `category` field pointing to its parent category
  - Each ServiceCategory has a `subCategories` array containing all its service type IDs

### 4. Verification Phase
- Validates all category-to-type relationships
- Ensures all references are correctly linked
- Checks that service types reference the correct categories

### 5. Summary Display
- Shows total counts (categories and types)
- Lists each category with:
  - Category name
  - Description
  - Number of service types
  - All service types with their codes

## Data Structure

### Service Categories (7 total)

Each category includes:
- `name`: Display name of the category
- `description`: Business context and use case
- `status`: Always set to `ACTIVE`
- `subCategories`: Array of ServiceType ObjectIds
- `createdAt` / `updatedAt`: Timestamps

### Service Types (31 total)

Each service type includes:
- `name`: Display name
- `code`: Unique uppercase identifier (e.g., `PERSONAL_CARE`)
- `category`: ObjectId reference to parent category
- `status`: Always set to `ACTIVE`
- `createdAt` / `updatedAt`: Timestamps

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║   Service Categories & Types - Cleanup and Seed Script     ║
╚════════════════════════════════════════════════════════════╝

✓ MongoDB connected successfully

=== Starting cleanup of existing data ===
Found 10 service types and 5 service categories
✓ Deleted 10 service types
✓ Deleted 5 service categories
✓ Dropped all ServiceCategory indexes
✓ Dropped all ServiceType indexes
=== Cleanup completed successfully ===

=== Starting seed process ===
✓ Successfully seeded 7 categories and 31 service types

=== Verifying data integrity ===
✓ All seed data verified successfully

=== Seed Summary ===
Total Categories: 7
Total Service Types: 31

📁 Assistance with Daily Life (Core)
   Description: This is one of the most used and highest-billing areas.
   Service Types: 8
      - Personal Care (PERSONAL_CARE)
      - Community Access (COMMUNITY_ACCESS)
      - In-Home Support (IN_HOME_SUPPORT)
      - Domestic Assistance (DOMESTIC_ASSISTANCE)
      - Household Tasks (HOUSEHOLD_TASKS)
      - Short Term Accommodation (STA) (SHORT_TERM_ACCOMMODATION)
      - SIL (Supported Independent Living) (SUPPORTED_INDEPENDENT_LIVING)
      - Respite (RESPITE)

[... other categories ...]

╔════════════════════════════════════════════════════════════╗
║              ✓ Script completed successfully!              ║
╚════════════════════════════════════════════════════════════╝
```

## Usage

### Initial Setup
```bash
npm run seed:services
```

### After Schema Changes
```bash
npm run seed:services
```

### Refreshing Data
```bash
npm run seed:services
```

## Important Notes

### ⚠️ Data Loss Warning
This script will **DELETE ALL** existing service types and categories. Always ensure:
- You have a database backup if needed
- You understand that all current data will be replaced
- Any references from other collections (e.g., shifts, workers) to service types will need to be updated

### Index Management
The script drops all indexes on both collections to ensure a clean state. MongoDB will automatically recreate the necessary indexes based on the schema definition when:
- Documents are inserted
- The application starts and syncs models

### Idempotency
The script is idempotent in the sense that:
- Running it multiple times produces the same result
- It always deletes and recreates all data
- No partial updates or merges occur

### Folder Structure Maintained
All Cloudinary folder paths and configurations remain unchanged:
- **Profile images:** `user-profiles/` folder
- **Receipt images:** `receipt-images/` folder
- **Documents:** `user-documents/` folder

The script only affects service category and type data, not file upload configurations.

## Integration with Existing System

### Files Modified

1. **`/scripts/cleanup-and-seed-services.ts`** (NEW)
   - Main script file
   - Handles connection, cleanup, seeding, verification, and summary

2. **`/package.json`** (UPDATED)
   - Added new npm script: `"seed:services": "ts-node scripts/cleanup-and-seed-services.ts"`

3. **`/scripts/README.md`** (UPDATED)
   - Added comprehensive documentation for the new script

### Files Used (Not Modified)

1. **`/src/seed/serviceCategoriesAndTypes.seed.ts`**
   - Contains the seed data and seeding logic
   - Imported and used by the cleanup script

2. **`/src/models/serviceCategory.model.ts`**
   - ServiceCategory Mongoose model

3. **`/src/models/serviceType.model.ts`**
   - ServiceType Mongoose model

## Error Handling

The script includes comprehensive error handling:
- Connection errors are logged and cause the script to exit
- Cleanup errors are logged with details
- Seed errors stop the process immediately
- Verification failures are reported clearly
- Database disconnection happens even on errors

## Future Enhancements

Possible improvements:
- Add confirmation prompt before deletion (for interactive runs)
- Support for incremental updates (upsert mode)
- Backup creation before cleanup
- Rollback capability
- Migration of existing data instead of deletion

## Related Documentation

- [Service Types Seed Data](/src/seed/serviceType.seed.ts) - Original seed file (now superseded)
- [Service Categories Model](/src/models/serviceCategory.model.ts)
- [Service Types Model](/src/models/serviceType.model.ts)
- [Scripts README](/scripts/README.md) - All available scripts

## Troubleshooting

### Error: "code_1 duplicate key error"
**Solution:** This error occurred when the database had a unique index on a `code` field that doesn't exist in the schema. The script now automatically drops all indexes before seeding.

### Error: "Cannot connect to MongoDB"
**Solution:** Check your `.env` file has the correct `MONGODB_URI` value and that your MongoDB server is running.

### Script hangs or times out
**Solution:** 
- Check your MongoDB connection
- Ensure no other process is locking the collections
- Check MongoDB server logs for issues

### Data verification fails
**Solution:**
- Review the logs to see which relationships are broken
- Check if the seed data in `serviceCategoriesAndTypes.seed.ts` is valid
- Ensure ObjectIds are being created correctly

## Summary

This script provides a reliable, repeatable way to refresh service categories and types data. It handles cleanup, seeding, verification, and reporting in a single automated process, making it easy to maintain consistent data across environments.
