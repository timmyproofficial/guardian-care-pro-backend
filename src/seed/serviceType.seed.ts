/**
 * Service Type seed data
 * Seeds the database with default service types based on the existing enum
 */

import mongoose from 'mongoose';
import ServiceType, { ServiceTypeStatus } from '../models/serviceType.model';
import logger from '../utils/logger';

/**
 * Service type seed data mapping from enum to model
 */
const serviceTypeSeedData = [
  {
    name: 'Personal Care',
    code: 'PERSONAL_CARE',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Household Tasks',
    code: 'HOUSEHOLD_TASKS',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Social Support',
    code: 'SOCIAL_SUPPORT',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Transport',
    code: 'TRANSPORT',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Meal Preparation',
    code: 'MEAL_PREPARATION',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Medication Support',
    code: 'MEDICATION_SUPPORT',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Mobility Assistance',
    code: 'MOBILITY_ASSISTANCE',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Therapy Support',
    code: 'THERAPY_SUPPORT',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Behavior Support',
    code: 'BEHAVIOR_SUPPORT',
    status: ServiceTypeStatus.ACTIVE
  },
  {
    name: 'Community Access',
    code: 'COMMUNITY_ACCESS',
    status: ServiceTypeStatus.ACTIVE
  }
];

/**
 * Seed service types
 */
export const seedServiceTypes = async (): Promise<void> => {
  try {
    logger.info('Starting service type seeding...');
    
    // Check if service types already exist
    const existingCount = await ServiceType.countDocuments();
    
    if (existingCount > 0) {
      logger.info(`Service types already exist (${existingCount} found). Skipping seed.`);
      return;
    }
    
    // Create service types
    const createdServiceTypes = await ServiceType.insertMany(serviceTypeSeedData);
    
    logger.info(`Successfully seeded ${createdServiceTypes.length} service types`);
    
    // Log created service types
    createdServiceTypes.forEach(serviceType => {
      logger.info(`Created service type: ${serviceType.name} (${serviceType.code})`);
    });
    
  } catch (error) {
    logger.error('Error seeding service types:', error);
    throw error;
  }
};

/**
 * Update existing service types to match current enum (for migration)
 */
export const updateServiceTypesFromEnum = async (): Promise<void> => {
  try {
    logger.info('Updating service types from enum...');
    
    for (const seedData of serviceTypeSeedData) {
      const existingServiceType = await ServiceType.findOne({ code: seedData.code });
      
      if (!existingServiceType) {
        // Create if doesn't exist
        const newServiceType = await ServiceType.create(seedData);
        logger.info(`Created new service type: ${newServiceType.name} (${newServiceType.code})`);
      } else {
        // Update name if it's different
        if (existingServiceType.name !== seedData.name) {
          existingServiceType.name = seedData.name;
          await existingServiceType.save();
          logger.info(`Updated service type name: ${existingServiceType.code} -> ${seedData.name}`);
        }
      }
    }
    
    logger.info('Service type update completed');
    
  } catch (error) {
    logger.error('Error updating service types from enum:', error);
    throw error;
  }
};

/**
 * Get service type ID by code (helper for migration)
 */
export const getServiceTypeIdByCode = async (code: string): Promise<mongoose.Types.ObjectId | null> => {
  try {
    const serviceType = await ServiceType.findOne({ code: code.toUpperCase() });
    return serviceType ? serviceType._id : null;
  } catch (error) {
    logger.error(`Error getting service type ID for code ${code}:`, error);
    return null;
  }
};

/**
 * Create service type code to ID mapping (helper for migration)
 */
export const createServiceTypeMapping = async (): Promise<Map<string, mongoose.Types.ObjectId>> => {
  try {
    const serviceTypes = await ServiceType.find({ status: ServiceTypeStatus.ACTIVE });
    const mapping = new Map<string, mongoose.Types.ObjectId>();
    
    serviceTypes.forEach(serviceType => {
      mapping.set(serviceType.code, serviceType._id);
    });
    
    return mapping;
  } catch (error) {
    logger.error('Error creating service type mapping:', error);
    throw error;
  }
};

/**
 * Verify expected service types exist in database (for validation)
 */
export const verifyServiceTypeSync = async (): Promise<boolean> => {
  try {
    const expectedCodes = serviceTypeSeedData.map(st => st.code);
    const dbServiceTypes = await ServiceType.find({ status: ServiceTypeStatus.ACTIVE });
    
    const dbCodes = dbServiceTypes.map(st => st.code);
    
    // Check if all expected codes exist in database
    const missingInDb = expectedCodes.filter(expectedCode => !dbCodes.includes(expectedCode));
    
    if (missingInDb.length > 0) {
      logger.warn('Service types missing in database:', missingInDb);
    }
    
    const isSync = missingInDb.length === 0;
    
    if (isSync) {
      logger.info('All expected service types exist in database');
    } else {
      logger.warn('Some expected service types are missing in database');
    }
    
    return isSync;
  } catch (error) {
    logger.error('Error verifying service type sync:', error);
    return false;
  }
};

// If run directly, execute seeding
if (require.main === module) {
  // This would be used for standalone execution
  console.log('ServiceType seed script - use seedServiceTypes() function to seed data');
} 