/**
 * Location Data Cleanup Script
 * Drops all location collections to allow re-seeding with fixed schema
 * 
 * Usage: npm run cleanup:locations
 * Or: ts-node scripts/cleanup-locations.ts
 */

import mongoose from 'mongoose';
import config from '../src/config/env';
import logger from '../src/utils/logger';

/**
 * Main cleanup function
 */
const cleanupLocationData = async (): Promise<void> => {
  try {
    logger.info('='.repeat(60));
    logger.info('🧹 LOCATION DATA CLEANUP');
    logger.info('='.repeat(60));

    // Connect to MongoDB
    logger.info('📡 Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url);
    logger.info('✓ Connected to MongoDB successfully');
    logger.info('');

    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    // List of collections to drop
    const collectionsToDrops = ['states', 'regions', 'suburbs', 'serviceareas'];
    
    logger.info('🗑️  Dropping location collections...');
    logger.info('');
    
    for (const collectionName of collectionsToDrops) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length > 0) {
          await db.dropCollection(collectionName);
          logger.info(`✓ Dropped collection: ${collectionName}`);
        } else {
          logger.info(`ℹ Collection not found (already clean): ${collectionName}`);
        }
      } catch (error: any) {
        if (error.code === 26) {
          // Collection doesn't exist - that's fine
          logger.info(`ℹ Collection not found (already clean): ${collectionName}`);
        } else {
          throw error;
        }
      }
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.info('✅ CLEANUP COMPLETED SUCCESSFULLY!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('You can now run: npm run seed:locations');
    logger.info('');

    // Disconnect from database
    await mongoose.disconnect();
    logger.info('📡 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    logger.error('');
    logger.error('='.repeat(60));
    logger.error('❌ ERROR DURING CLEANUP');
    logger.error('='.repeat(60));
    logger.error('Error details:', error);
    
    // Disconnect on error
    try {
      await mongoose.disconnect();
      logger.info('📡 Disconnected from MongoDB');
    } catch (disconnectError) {
      logger.error('Error disconnecting:', disconnectError);
    }
    
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the cleanup
logger.info('');
logger.info('Starting Location Data Cleanup...');
logger.info('');

cleanupLocationData();

