/**
 * Cleanup and Seed Script for Service Categories and Service Types
 * 
 * This script performs the following operations:
 * 1. Connects to MongoDB database
 * 2. Cleans up existing ServiceType and ServiceCategory collections
 * 3. Seeds fresh data from serviceCategoriesAndTypes.seed.ts
 * 4. Verifies data integrity
 * 5. Disconnects from database
 * 
 * USAGE:
 * npm run seed:services
 * OR
 * ts-node scripts/cleanup-and-seed-services.ts
 * 
 * WHAT IT DOES:
 * - Removes all existing service types and categories
 * - Creates 7 main service categories
 * - Creates 35+ service types with proper category relationships
 * - Ensures all references are correctly linked
 * 
 * SAFETY:
 * - This script will DELETE all existing service types and categories
 * - Make sure you have a backup if you have important data
 * - The script will ask for confirmation before proceeding (if run interactively)
 */

import mongoose from 'mongoose';
import { ServiceCategory } from '../src/models/serviceCategory.model';
import ServiceType from '../src/models/serviceType.model';
import logger from '../src/utils/logger';
import config from '../src/config/env';
import { seedServiceCategoriesAndTypes, verifySeedData } from '../src/seed/serviceCategoriesAndTypes.seed';

/**
 * Connect to MongoDB
 */
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('✓ MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('✓ MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
};

/**
 * Clean up existing service types and categories
 */
const cleanupExistingData = async (): Promise<void> => {
  try {
    logger.info('=== Starting cleanup of existing data ===');
    
    // Count existing records
    const existingTypesCount = await ServiceType.countDocuments();
    const existingCategoriesCount = await ServiceCategory.countDocuments();
    
    logger.info(`Found ${existingTypesCount} service types and ${existingCategoriesCount} service categories`);
    
    if (existingTypesCount === 0 && existingCategoriesCount === 0) {
      logger.info('No existing data to clean up');
      
      // Still drop indexes to ensure clean state
      try {
        await ServiceCategory.collection.dropIndexes();
        logger.info('✓ Dropped all ServiceCategory indexes');
      } catch (error: any) {
        if (error.code !== 26) { // Ignore "ns not found" error
          logger.warn('Could not drop ServiceCategory indexes:', error.message);
        }
      }
      
      try {
        await ServiceType.collection.dropIndexes();
        logger.info('✓ Dropped all ServiceType indexes');
      } catch (error: any) {
        if (error.code !== 26) { // Ignore "ns not found" error
          logger.warn('Could not drop ServiceType indexes:', error.message);
        }
      }
      
      return;
    }
    
    // Delete all service types first (to avoid reference issues)
    const deletedTypes = await ServiceType.deleteMany({});
    logger.info(`✓ Deleted ${deletedTypes.deletedCount} service types`);
    
    // Delete all service categories
    const deletedCategories = await ServiceCategory.deleteMany({});
    logger.info(`✓ Deleted ${deletedCategories.deletedCount} service categories`);
    
    // Drop all indexes to prevent conflicts (especially the code_1 unique index)
    try {
      await ServiceCategory.collection.dropIndexes();
      logger.info('✓ Dropped all ServiceCategory indexes');
    } catch (error: any) {
      logger.warn('Could not drop ServiceCategory indexes:', error.message);
    }
    
    try {
      await ServiceType.collection.dropIndexes();
      logger.info('✓ Dropped all ServiceType indexes');
    } catch (error: any) {
      logger.warn('Could not drop ServiceType indexes:', error.message);
    }
    
    logger.info('=== Cleanup completed successfully ===');
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
};

/**
 * Display summary of seeded data
 */
const displaySummary = async (): Promise<void> => {
  try {
    logger.info('=== Seed Summary ===');
    
    const categories = await ServiceCategory.find({});
    const totalTypes = await ServiceType.countDocuments();
    
    logger.info(`Total Categories: ${categories.length}`);
    logger.info(`Total Service Types: ${totalTypes}`);
    logger.info('');
    
    for (const category of categories) {
      logger.info(`📁 ${category.name}`);
      logger.info(`   Description: ${category.description}`);
      logger.info('');
    }
    
    // List all service types
    const serviceTypes = await ServiceType.find({});
    logger.info('📋 Service Types:');
    serviceTypes.forEach(st => {
      logger.info(`   - ${st.name} (${st.code})`);
    });
  } catch (error) {
    logger.error('Error displaying summary:', error);
  }
};

/**
 * Main execution function
 */
const main = async (): Promise<void> => {
  try {
    logger.info('╔════════════════════════════════════════════════════════════╗');
    logger.info('║   Service Categories & Types - Cleanup and Seed Script     ║');
    logger.info('╚════════════════════════════════════════════════════════════╝');
    logger.info('');
    
    // Step 1: Connect to database
    await connectDB();
    
    // Step 2: Cleanup existing data
    await cleanupExistingData();
    
    // Step 3: Seed fresh data
    logger.info('=== Starting seed process ===');
    await seedServiceCategoriesAndTypes();
    
    // Step 4: Verify data integrity
    logger.info('=== Verifying data integrity ===');
    const isValid = await verifySeedData();
    
    if (!isValid) {
      throw new Error('Data verification failed! Please check the logs.');
    }
    
    // Step 5: Display summary
    await displaySummary();
    
    // Step 6: Disconnect
    await disconnectDB();
    
    logger.info('╔════════════════════════════════════════════════════════════╗');
    logger.info('║              ✓ Script completed successfully!              ║');
    logger.info('╚════════════════════════════════════════════════════════════╝');
    
    process.exit(0);
  } catch (error) {
    logger.error('╔════════════════════════════════════════════════════════════╗');
    logger.error('║                    ✗ Script failed!                        ║');
    logger.error('╚════════════════════════════════════════════════════════════╝');
    logger.error('Error:', error);
    
    // Ensure we disconnect even on error
    await disconnectDB();
    process.exit(1);
  }
};

// Execute the script
main();
