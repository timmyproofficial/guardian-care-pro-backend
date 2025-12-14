/**
 * Complete seed script for service categories and service types
 * Seeds both models with proper relationships
 */

import mongoose from 'mongoose';
import { ServiceCategory, ServiceCategoryStatus } from '../models/serviceCategory.model';
import ServiceType, { ServiceTypeStatus } from '../models/serviceType.model';
import logger from '../utils/logger';

/**
 * Service categories with their subcategories (service types)
 */
const serviceCategoriesData = [
  {
    name: 'Assistance with Daily Life (Core)',
    description: 'This is one of the most used and highest-billing areas.',
    serviceTypes: [
      { name: 'Personal Care', code: 'PERSONAL_CARE' },
      { name: 'Community Access', code: 'COMMUNITY_ACCESS' },
      { name: 'In-Home Support', code: 'IN_HOME_SUPPORT' },
      { name: 'Domestic Assistance', code: 'DOMESTIC_ASSISTANCE' },
      { name: 'Household Tasks', code: 'HOUSEHOLD_TASKS' },
      { name: 'Short Term Accommodation (STA)', code: 'SHORT_TERM_ACCOMMODATION' },
      { name: 'SIL (Supported Independent Living)', code: 'SUPPORTED_INDEPENDENT_LIVING' },
      { name: 'Respite', code: 'RESPITE' }
    ]
  },
  {
    name: 'Community & Social Participation / Community Access',
    description: 'Supporting social inclusion, independence and participation.',
    serviceTypes: [
      { name: 'Community Outings & Social Activities', code: 'COMMUNITY_OUTINGS_SOCIAL_ACTIVITIES' },
      { name: 'Recreation, Social Support & Companionship', code: 'RECREATION_SOCIAL_SUPPORT_COMPANIONSHIP' },
      { name: 'Group Outings / Group-Based Activities', code: 'GROUP_OUTINGS_ACTIVITIES' },
      { name: 'Escort/Transport to Community & Social Events', code: 'ESCORT_TRANSPORT_COMMUNITY_EVENTS' }
    ]
  },
  {
    name: 'Transport & Travel Support',
    description: 'Essential for enabling access to services, community, and appointments.',
    serviceTypes: [
      { name: 'Transport / Travel Assistance by Support Worker', code: 'TRANSPORT_TRAVEL_ASSISTANCE' },
      { name: 'Escort Services / Travel Support to Community, Appointments, Events', code: 'ESCORT_SERVICES_TRAVEL_SUPPORT' },
      { name: 'Per-km Transport Support', code: 'PER_KM_TRANSPORT_SUPPORT' }
    ]
  },
  {
    name: 'Household & Domestic Support',
    description: 'Supports independent living and wellbeing at home.',
    serviceTypes: [
      { name: 'Household Tasks & Cleaning', code: 'HOUSEHOLD_TASKS_CLEANING' },
      { name: 'Gardening / Yard Maintenance / Home Maintenance', code: 'GARDENING_YARD_HOME_MAINTENANCE' },
      { name: 'Meal Preparation & Assistance with Food / Nutrition', code: 'MEAL_PREPARATION_NUTRITION' },
      { name: 'Laundry, Chores, Home Upkeep', code: 'LAUNDRY_CHORES_HOME_UPKEEP' }
    ]
  },
  {
    name: 'Capacity Building, Therapy & Daily Living Skills',
    description: 'Support for skill acquisition, therapy, and improving independence / wellbeing.',
    serviceTypes: [
      { name: 'Life-Skills Training (Daily Living, Independent Living, Household Management)', code: 'LIFE_SKILLS_TRAINING' },
      { name: 'Therapy / Allied-Health Services (Physiotherapy, Psychology, OT, Speech, etc.)', code: 'THERAPY_ALLIED_HEALTH_SERVICES' },
      { name: 'Behaviour Support, Counselling, Wellbeing Support', code: 'BEHAVIOUR_SUPPORT_COUNSELLING' },
      { name: 'Training & Development to Build Independence', code: 'TRAINING_DEVELOPMENT_INDEPENDENCE' }
    ]
  },
  {
    name: 'Supported / Shared Living & Group / Centre-Based Supports',
    description: 'For participants needing supported housing, group living, or centre-based supports.',
    serviceTypes: [
      { name: 'Supported Independent Living (SIL)', code: 'SIL_SUPPORTED_LIVING' },
      { name: 'Shared Living / Group Home Support', code: 'SHARED_LIVING_GROUP_HOME' },
      { name: 'Centre-Based Activities or Group Day Programs', code: 'CENTRE_BASED_ACTIVITIES' },
      { name: 'Shared-Living Support, 24/7 or Scheduled', code: 'SHARED_LIVING_SUPPORT_24_7' }
    ]
  },
  {
    name: 'Assistive Technology (AT), Consumables & Equipment Support',
    description: 'Supporting independence via equipment and supplies.',
    serviceTypes: [
      { name: 'Low-Cost Assistive Technology & Aids', code: 'LOW_COST_ASSISTIVE_TECHNOLOGY' },
      { name: 'Consumables (Continence Products, Mobility Aids, Minor Medical Supplies)', code: 'CONSUMABLES_MEDICAL_SUPPLIES' },
      { name: 'Equipment Maintenance & Repairs', code: 'EQUIPMENT_MAINTENANCE_REPAIRS' },
      { name: 'Supplies Required for Daily Living / Support Delivery', code: 'SUPPLIES_DAILY_LIVING_SUPPORT' }
    ]
  }
];

/**
 * Main seed function - creates categories and service types with proper relationships
 */
export const seedServiceCategoriesAndTypes = async (): Promise<void> => {
  try {
    logger.info('Starting service categories and types seeding...');
    
    // Check if data already exists
    const existingCategoriesCount = await ServiceCategory.countDocuments();
    const existingTypesCount = await ServiceType.countDocuments();
    
    if (existingCategoriesCount > 0 || existingTypesCount > 0) {
      logger.info(`Data already exists (Categories: ${existingCategoriesCount}, Types: ${existingTypesCount}). Skipping seed.`);
      return;
    }
    
    let totalServiceTypes = 0;
    
    // Process each category
    for (const categoryData of serviceCategoriesData) {
      logger.info(`Processing category: ${categoryData.name}`);
      
      // Step 1: Create the service category (without subCategories initially)
      const category = await ServiceCategory.create({
        name: categoryData.name,
        description: categoryData.description,
        status: ServiceCategoryStatus.ACTIVE,
        subCategories: [] // Empty array initially
      });
      
      logger.info(`Created category: ${category.name} (${category._id})`);
      
      // Step 2: Create all service types for this category
      const serviceTypeIds: mongoose.Types.ObjectId[] = [];
      
      for (const serviceTypeData of categoryData.serviceTypes) {
        const serviceType = await ServiceType.create({
          name: serviceTypeData.name,
          code: serviceTypeData.code,
          category: category._id, // Reference to the category
          status: ServiceTypeStatus.ACTIVE
        });
        
        serviceTypeIds.push(serviceType._id);
        totalServiceTypes++;
        
        logger.info(`  - Created service type: ${serviceType.name} (${serviceType.code})`);
      }
      
      // Step 3: Update the category with the service type IDs
      category.subCategories = serviceTypeIds;
      await category.save();
      
      logger.info(`Updated category ${category.name} with ${serviceTypeIds.length} service types`);
    }
    
    logger.info(`✓ Successfully seeded ${serviceCategoriesData.length} categories and ${totalServiceTypes} service types`);
    
  } catch (error) {
    logger.error('Error seeding service categories and types:', error);
    throw error;
  }
};

/**
 * Get service category by name
 */
export const getServiceCategoryByName = async (name: string): Promise<any> => {
  try {
    const category = await ServiceCategory.findOne({ name }).populate('subCategories');
    return category;
  } catch (error) {
    logger.error(`Error getting category by name ${name}:`, error);
    return null;
  }
};

/**
 * Get service types by category
 */
export const getServiceTypesByCategory = async (categoryId: string): Promise<any[]> => {
  try {
    const serviceTypes = await ServiceType.find({ 
      category: categoryId,
      status: ServiceTypeStatus.ACTIVE 
    });
    return serviceTypes;
  } catch (error) {
    logger.error(`Error getting service types by category ${categoryId}:`, error);
    return [];
  }
};

/**
 * Get service type by code
 */
export const getServiceTypeByCode = async (code: string): Promise<any> => {
  try {
    const serviceType = await ServiceType.findOne({ 
      code: code.toUpperCase() 
    }).populate('category');
    return serviceType;
  } catch (error) {
    logger.error(`Error getting service type by code ${code}:`, error);
    return null;
  }
};

/**
 * Verify seed data integrity
 */
export const verifySeedData = async (): Promise<boolean> => {
  try {
    const categories = await ServiceCategory.find({}).populate('subCategories');
    
    logger.info('=== Seed Data Verification ===');
    
    for (const category of categories) {
      logger.info(`Category: ${category.name}`);
      logger.info(`  - SubCategories count: ${category.subCategories.length}`);
      
      // Verify all service types exist and reference correct category
      for (const subCatId of category.subCategories) {
        const serviceType = await ServiceType.findById(subCatId);
        if (!serviceType) {
          logger.error(`  - ERROR: Service type ${subCatId} not found`);
          return false;
        }
        if (serviceType.category.toString() !== category._id.toString()) {
          logger.error(`  - ERROR: Service type ${serviceType.name} has wrong category reference`);
          return false;
        }
      }
    }
    
    logger.info('✓ All seed data verified successfully');
    return true;
  } catch (error) {
    logger.error('Error verifying seed data:', error);
    return false;
  }
};

// If run directly
if (require.main === module) {
  console.log('Service Category and Type seed script - use seedServiceCategoriesAndTypes() to seed data');
}