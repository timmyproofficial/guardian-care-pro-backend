/**
 * Location Data Seeder Script
 * One-time script to seed Australian states, regions, suburbs, and service areas
 * 
 * Usage: npm run seed:locations
 * Or: ts-node scripts/seed-locations.ts
 */

import mongoose from 'mongoose';
import config from '../src/config/env';
import logger from '../src/utils/logger';
import { seedLocationData } from '../src/seed/location.seed';

/**
 * Main seeding function
 */
const runLocationSeeder = async (): Promise<void> => {
  try {
    logger.info('='.repeat(60));
    logger.info('🌏 LOCATION DATA SEEDER');
    logger.info('='.repeat(60));

    // Connect to MongoDB
    logger.info('📡 Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url);
    logger.info('✓ Connected to MongoDB successfully');
    logger.info('');

    // Run location seed
    logger.info('🚀 Starting location data seeding...');
    logger.info('');
    await seedLocationData();
    logger.info('');

    logger.info('='.repeat(60));
    logger.info('✅ LOCATION DATA SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Seeded data includes:');
    logger.info('  • 8 Australian States and Territories');
    logger.info('  • 25+ Major Regions');
    logger.info('  • 20+ Sample Suburbs with GPS coordinates');
    logger.info('  • 15+ Service Areas');
    logger.info('');

    // Disconnect from database
    await mongoose.disconnect();
    logger.info('📡 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    logger.error('');
    logger.error('='.repeat(60));
    logger.error('❌ ERROR SEEDING LOCATION DATA');
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

// Run the seeder
logger.info('');
logger.info('Starting Location Data Seeder...');
logger.info('');

runLocationSeeder();

