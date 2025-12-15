/**
 * Complete seed script for service categories and service types
 * Seeds both models independently (no relationships)
 */

import { ServiceCategory, ServiceCategoryStatus } from '../models/serviceCategory.model';
import ServiceType, { ServiceTypeStatus } from '../models/serviceType.model';
import logger from '../utils/logger';

/**
 * Service categories data (standalone)
 */
const serviceCategoriesData = [
  {
    name: 'Assistance with Daily Life (Core)',
    description: 'This is one of the most used and highest-billing areas.',
  },
  {
    name: 'Community & Social Participation / Community Access',
    description: 'Supporting social inclusion, independence and participation.',
  },
  {
    name: 'Transport & Travel Support',
    description: 'Essential for enabling access to services, community, and appointments.',
  },
  {
    name: 'Household & Domestic Support',
    description: 'Supports independent living and wellbeing at home.',
  },
  {
    name: 'Capacity Building, Therapy & Daily Living Skills',
    description: 'Support for skill acquisition, therapy, and improving independence / wellbeing.',
  },
  {
    name: 'Supported / Shared Living & Group / Centre-Based Supports',
    description: 'For participants needing supported housing, group living, or centre-based supports.',
  },
  {
    name: 'Assistive Technology (AT), Consumables & Equipment Support',
    description: 'Supporting independence via equipment and supplies.',
  }
];

/**
 * Service types data (standalone)
 */
const serviceTypesData = [
  // Assistance with Daily Life (Core)
  { name: 'Personal Care', code: 'PERSONAL_CARE' },
  { name: 'Community Access', code: 'COMMUNITY_ACCESS' },
  { name: 'In-Home Support', code: 'IN_HOME_SUPPORT' },
  { name: 'Domestic Assistance', code: 'DOMESTIC_ASSISTANCE' },
  { name: 'Household Tasks', code: 'HOUSEHOLD_TASKS' },
  { name: 'Short Term Accommodation (STA)', code: 'SHORT_TERM_ACCOMMODATION' },
  { name: 'SIL (Supported Independent Living)', code: 'SUPPORTED_INDEPENDENT_LIVING' },
  { name: 'Respite', code: 'RESPITE' },
  
  // Community & Social Participation
  { name: 'Community Outings & Social Activities', code: 'COMMUNITY_OUTINGS_SOCIAL_ACTIVITIES' },
  { name: 'Recreation, Social Support & Companionship', code: 'RECREATION_SOCIAL_SUPPORT_COMPANIONSHIP' },
  { name: 'Group Outings / Group-Based Activities', code: 'GROUP_OUTINGS_ACTIVITIES' },
  { name: 'Escort/Transport to Community & Social Events', code: 'ESCORT_TRANSPORT_COMMUNITY_EVENTS' },
  
  // Transport & Travel Support
  { name: 'Transport / Travel Assistance by Support Worker', code: 'TRANSPORT_TRAVEL_ASSISTANCE' },
  { name: 'Escort Services / Travel Support to Community, Appointments, Events', code: 'ESCORT_SERVICES_TRAVEL_SUPPORT' },
  { name: 'Per-km Transport Support', code: 'PER_KM_TRANSPORT_SUPPORT' },
  
  // Household & Domestic Support
  { name: 'Household Tasks & Cleaning', code: 'HOUSEHOLD_TASKS_CLEANING' },
  { name: 'Gardening / Yard Maintenance / Home Maintenance', code: 'GARDENING_YARD_HOME_MAINTENANCE' },
  { name: 'Meal Preparation & Assistance with Food / Nutrition', code: 'MEAL_PREPARATION_NUTRITION' },
  { name: 'Laundry, Chores, Home Upkeep', code: 'LAUNDRY_CHORES_HOME_UPKEEP' },
  
  // Capacity Building, Therapy & Daily Living Skills
  { name: 'Life-Skills Training (Daily Living, Independent Living, Household Management)', code: 'LIFE_SKILLS_TRAINING' },
  { name: 'Therapy / Allied-Health Services (Physiotherapy, Psychology, OT, Speech, etc.)', code: 'THERAPY_ALLIED_HEALTH_SERVICES' },
  { name: 'Behaviour Support, Counselling, Wellbeing Support', code: 'BEHAVIOUR_SUPPORT_COUNSELLING' },
  { name: 'Training & Development to Build Independence', code: 'TRAINING_DEVELOPMENT_INDEPENDENCE' },
  
  // Supported / Shared Living & Group / Centre-Based Supports
  { name: 'Supported Independent Living (SIL)', code: 'SIL_SUPPORTED_LIVING' },
  { name: 'Shared Living / Group Home Support', code: 'SHARED_LIVING_GROUP_HOME' },
  { name: 'Centre-Based Activities or Group Day Programs', code: 'CENTRE_BASED_ACTIVITIES' },
  { name: 'Shared-Living Support, 24/7 or Scheduled', code: 'SHARED_LIVING_SUPPORT_24_7' },
  
  // Assistive Technology (AT), Consumables & Equipment Support
  { name: 'Low-Cost Assistive Technology & Aids', code: 'LOW_COST_ASSISTIVE_TECHNOLOGY' },
  { name: 'Consumables (Continence Products, Mobility Aids, Minor Medical Supplies)', code: 'CONSUMABLES_MEDICAL_SUPPLIES' },
  { name: 'Equipment Maintenance & Repairs', code: 'EQUIPMENT_MAINTENANCE_REPAIRS' },
  { name: 'Supplies Required for Daily Living / Support Delivery', code: 'SUPPLIES_DAILY_LIVING_SUPPORT' }
];

/**
 * Main seed function - creates categories and service types independently
 */
export const seedServiceCategoriesAndTypes = async (): Promise<void> => {
  try {
    logger.info('Starting service categories and types seeding...');
    
    // Clear existing data
    await ServiceCategory.deleteMany({});
    await ServiceType.deleteMany({});
    logger.info('Cleared existing service categories and types');
    
    // Seed service categories
    logger.info('Seeding service categories...');
    const categories = await ServiceCategory.insertMany(
      serviceCategoriesData.map(cat => ({
        name: cat.name,
        description: cat.description,
        status: ServiceCategoryStatus.ACTIVE
      }))
    );
    logger.info(`✓ Successfully seeded ${categories.length} service categories`);
    
    // Seed service types
    logger.info('Seeding service types...');
    const serviceTypes = await ServiceType.insertMany(
      serviceTypesData.map(type => ({
        name: type.name,
        code: type.code,
        status: ServiceTypeStatus.ACTIVE
      }))
    );
    logger.info(`✓ Successfully seeded ${serviceTypes.length} service types`);
    
    logger.info('=== Seeding Complete ===');
    logger.info(`Total Categories: ${categories.length}`);
    logger.info(`Total Service Types: ${serviceTypes.length}`);
    
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
    const category = await ServiceCategory.findOne({ name });
    return category;
  } catch (error) {
    logger.error(`Error getting category by name ${name}:`, error);
    return null;
  }
};

/**
 * Get service type by code
 */
export const getServiceTypeByCode = async (code: string): Promise<any> => {
  try {
    const serviceType = await ServiceType.findOne({ 
      code: code.toUpperCase() 
    });
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
    const categoriesCount = await ServiceCategory.countDocuments();
    const serviceTypesCount = await ServiceType.countDocuments();
    
    logger.info('=== Seed Data Verification ===');
    logger.info(`Total Categories: ${categoriesCount}`);
    logger.info(`Total Service Types: ${serviceTypesCount}`);
    
    if (categoriesCount === 0 || serviceTypesCount === 0) {
      logger.error('ERROR: Missing seed data');
      return false;
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