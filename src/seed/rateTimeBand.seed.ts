import mongoose from 'mongoose';
import RateTimeBand from '../models/rateTimeBand.model';
import config from '../config/env';
import logger from '../utils/logger';

/**
 * Seed default shift types
 */
export const seedRateTimeBands = async (): Promise<void> => {
  try {
    // Check if shift types already exist
    const count = await RateTimeBand.countDocuments();
    
    if (count > 0) {
      logger.info('Shift types already seeded, skipping...');
      return;
    }
    
    // Default shift types
    const defaultRateTimeBands = [
      {
        name: 'Morning Shift',
        code: 'MORNING',
        startTime: '06:00',
        endTime: '14:00',
        description: 'Early morning to early afternoon shift',
        isWeekend: false,
        isPublicHoliday: false,
        isSleepover: false,
        baseRateMultiplier: 1.0
      },
      {
        name: 'Afternoon Shift',
        code: 'AFTERNOON',
        startTime: '14:00',
        endTime: '22:00',
        description: 'Early afternoon to late evening shift',
        isWeekend: false,
        isPublicHoliday: false,
        isSleepover: false,
        baseRateMultiplier: 1.0
      },
      {
        name: 'Night Shift',
        code: 'NIGHT',
        startTime: '22:00',
        endTime: '06:00',
        description: 'Overnight shift',
        isWeekend: false,
        isPublicHoliday: false,
        isSleepover: true,
        baseRateMultiplier: 1.25
      },
      {
        name: 'Weekend Shift',
        code: 'WEEKEND',
        description: 'Any shift during the weekend',
        isWeekend: true,
        isPublicHoliday: false,
        isSleepover: false,
        baseRateMultiplier: 1.5
      },
      {
        name: 'Public Holiday Shift',
        code: 'HOLIDAY',
        description: 'Any shift during a public holiday',
        isWeekend: false,
        isPublicHoliday: true,
        isSleepover: false,
        baseRateMultiplier: 2.0
      }
    ];
    
    // Insert default shift types
    await RateTimeBand.insertMany(defaultRateTimeBands);
    
    logger.info('Default shift types seeded successfully');
  } catch (error) {
    logger.error('Error seeding shift types:', error);
    throw error;
  }
};

// Call the seed function when the server starts
export const initializeRateTimeBands = async (): Promise<void> => {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoose.url);
    }
    
    await seedRateTimeBands();
  } catch (error) {
    logger.error('Failed to initialize shift types:', error);
  }
};