/**
 * Migration Script: Clean up partial GeoJSON data
 * 
 * This script removes incomplete GeoJSON objects from participants and workers
 * that were created with the old schema (where type had a default but no coordinates).
 * 
 * Run with: npm run cleanup:geojson
 */

import mongoose from 'mongoose';
import config from '../src/config/env';
import logger from '../src/utils/logger';

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Clean up partial GeoJSON in participants
 */
const cleanupParticipantGeoJSON = async (): Promise<void> => {
  try {
    logger.info('\n🔧 Cleaning up participant GeoJSON data...');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not established');
    }
    
    const usersCollection = db.collection('users');
    
    // Find participants with partial GeoJSON (has type but no coordinates or empty coordinates)
    const participantsWithPartialGeoJSON = await usersCollection.find({
      role: 'participant',
      $or: [
        { 
          'participantLocation.type': { $exists: true },
          'participantLocation.coordinates': { $exists: false }
        },
        {
          'participantLocation.type': { $exists: true },
          'participantLocation.coordinates': { $size: 0 }
        },
        {
          'participantLocation.type': { $exists: true },
          'participantLocation.coordinates': null
        }
      ]
    }).toArray();
    
    logger.info(`📊 Found ${participantsWithPartialGeoJSON.length} participants with partial GeoJSON`);
    
    if (participantsWithPartialGeoJSON.length > 0) {
      // Remove the participantLocation field from these documents
      const result = await usersCollection.updateMany(
        {
          _id: { $in: participantsWithPartialGeoJSON.map(p => p._id) }
        },
        {
          $unset: { participantLocation: '' }
        }
      );
      
      logger.info(`✅ Cleaned up ${result.modifiedCount} participants`);
    } else {
      logger.info('✅ No partial GeoJSON found in participants');
    }
  } catch (error) {
    logger.error('❌ Error cleaning up participant GeoJSON:', error);
    throw error;
  }
};

/**
 * Clean up partial GeoJSON in workers
 */
const cleanupWorkerGeoJSON = async (): Promise<void> => {
  try {
    logger.info('\n🔧 Cleaning up worker GeoJSON data...');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not established');
    }
    
    const usersCollection = db.collection('users');
    
    // Find workers with partial GeoJSON (has type but no coordinates or empty coordinates)
    const workersWithPartialGeoJSON = await usersCollection.find({
      role: 'supportWorker',
      $or: [
        { 
          'baseLocation.type': { $exists: true },
          'baseLocation.coordinates': { $exists: false }
        },
        {
          'baseLocation.type': { $exists: true },
          'baseLocation.coordinates': { $size: 0 }
        },
        {
          'baseLocation.type': { $exists: true },
          'baseLocation.coordinates': null
        }
      ]
    }).toArray();
    
    logger.info(`📊 Found ${workersWithPartialGeoJSON.length} workers with partial GeoJSON`);
    
    if (workersWithPartialGeoJSON.length > 0) {
      // Remove the baseLocation field from these documents
      const result = await usersCollection.updateMany(
        {
          _id: { $in: workersWithPartialGeoJSON.map(w => w._id) }
        },
        {
          $unset: { baseLocation: '' }
        }
      );
      
      logger.info(`✅ Cleaned up ${result.modifiedCount} workers`);
    } else {
      logger.info('✅ No partial GeoJSON found in workers');
    }
  } catch (error) {
    logger.error('❌ Error cleaning up worker GeoJSON:', error);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  logger.info('='.repeat(60));
  logger.info('🚀 STARTING GEOJSON CLEANUP');
  logger.info('='.repeat(60));
  
  try {
    await connectDB();
    await cleanupParticipantGeoJSON();
    await cleanupWorkerGeoJSON();
    
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ GEOJSON CLEANUP COMPLETED SUCCESSFULLY');
    logger.info('='.repeat(60) + '\n');
    
    await mongoose.disconnect();
    logger.info('📡 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    logger.error('\n' + '='.repeat(60));
    logger.error('❌ ERROR DURING GEOJSON CLEANUP');
    logger.error('='.repeat(60));
    logger.error('Error details:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
main();

