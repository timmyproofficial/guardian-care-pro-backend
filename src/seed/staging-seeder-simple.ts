/**
 * Simplified Staging Database Seeder
 *
 * Seeds the GuardianCarePro database with essential staging data.
 * This is a simplified version focused on core functionality.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';
import { UserRole, UserStatus } from '../types/user.types';
import logger from '../utils/logger';
import config from '../config/env';

/**
 * Connect to MongoDB
 */
const connectDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoose.url);
    }
    logger.info('✓ Connected to MongoDB for simplified staging seeding');
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
    logger.info('✓ Disconnected from MongoDB');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
  }
};

/**
 * Generate Australian phone number
 */
const generateAUSPhone = (): string => {
  const prefixes = ['0412', '0413', '0414', '0415', '0416'];
  const suffix = Math.floor(Math.random() * 90000000) + 10000000;
  return `+61${prefixes[Math.floor(Math.random() * prefixes.length)].substring(1)}${suffix}`;
};

/**
 * Australian names for realistic seeding
 */
const AUSTRALIAN_FIRST_NAMES = [
  'James', 'Olivia', 'William', 'Charlotte', 'Jack', 'Amelia', 'Alexander', 'Isabella',
  'Lachlan', 'Mia', 'Oliver', 'Ava', 'Thomas', 'Grace', 'Ethan', 'Chloe'
];

const AUSTRALIAN_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'
];

/**
 * Seed admin users
 */
const seedAdminUsers = async (): Promise<void> => {
  try {
    logger.info('Seeding admin users...');

    const adminUsers = [
      {
        email: 'admin@guardiance.com',
        password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
        firstName: 'System',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        phone: generateAUSPhone(),
        isEmailVerified: true
      },
      {
        email: 'manager@guardiance.com',
        password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
        firstName: 'Operations',
        lastName: 'Manager',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        phone: generateAUSPhone(),
        isEmailVerified: true
      }
    ];

    for (const adminData of adminUsers) {
      const existingUser = await User.findOne({ email: adminData.email });
      if (!existingUser) {
        await User.create(adminData);
        logger.info(`✓ Created admin: ${adminData.firstName} ${adminData.lastName}`);
      } else {
        logger.info(`⚠ Admin already exists: ${adminData.email}`);
      }
    }

    logger.info('✓ Admin users seeded successfully');
  } catch (error) {
    logger.error('Error seeding admin users:', error);
    throw error;
  }
};

/**
 * Seed support workers
 */
const seedSupportWorkers = async (): Promise<void> => {
  try {
    logger.info('Seeding support workers...');

    // Create 25 support workers with realistic Australian data
    for (let i = 0; i < 25; i++) {
      const firstName = AUSTRALIAN_FIRST_NAMES[Math.floor(Math.random() * AUSTRALIAN_FIRST_NAMES.length)];
      const lastName = AUSTRALIAN_LAST_NAMES[Math.floor(Math.random() * AUSTRALIAN_LAST_NAMES.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@workers.com.au`;

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        const userData = {
          email,
          password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
          firstName,
          lastName,
          role: UserRole.SUPPORT_WORKER,
          status: UserStatus.ACTIVE,
          phone: generateAUSPhone(),
          isEmailVerified: true,
          dateOfBirth: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        };

        await User.create(userData);
        logger.info(`✓ Created support worker: ${firstName} ${lastName}`);
      }
    }

    logger.info('✓ Support workers seeded successfully');
  } catch (error) {
    logger.error('Error seeding support workers:', error);
    throw error;
  }
};

/**
 * Seed participants
 */
const seedParticipants = async (): Promise<void> => {
  try {
    logger.info('Seeding participants...');

    // Create 25 participants with realistic Australian data
    for (let i = 0; i < 25; i++) {
      const firstName = AUSTRALIAN_FIRST_NAMES[Math.floor(Math.random() * AUSTRALIAN_FIRST_NAMES.length)];
      const lastName = AUSTRALIAN_LAST_NAMES[Math.floor(Math.random() * AUSTRALIAN_LAST_NAMES.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@participants.com.au`;

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        const userData = {
          email,
          password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
          firstName,
          lastName,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          phone: generateAUSPhone(),
          isEmailVerified: true,
          dateOfBirth: new Date(1950 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        };

        await User.create(userData);
        logger.info(`✓ Created participant: ${firstName} ${lastName}`);
      }
    }

    logger.info('✓ Participants seeded successfully');
  } catch (error) {
    logger.error('Error seeding participants:', error);
    throw error;
  }
};

/**
 * Display seeding summary
 */
const displaySeedingSummary = async (): Promise<void> => {
  try {
    logger.info('\n' + '='.repeat(60));
    logger.info('🎉 SIMPLIFIED STAGING DATABASE SEEDING COMPLETE');
    logger.info('='.repeat(60));

    const [
      userCount, adminCount, workerCount, participantCount
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.ADMIN }),
      User.countDocuments({ role: UserRole.SUPPORT_WORKER }),
      User.countDocuments({ role: UserRole.PARTICIPANT })
    ]);

    logger.info(`👥 Total Users: ${userCount}`);
    logger.info(`  └─ Admins: ${adminCount}`);
    logger.info(`  └─ Support Workers: ${workerCount}`);
    logger.info(`  └─ Participants: ${participantCount}`);

    logger.info('\n' + '='.repeat(60));
    logger.info('📋 ADMIN CREDENTIALS:');
    logger.info('  admin@guardiance.com / REDACTED_SEED_PASSWORD');
    logger.info('  manager@guardiance.com / REDACTED_SEED_PASSWORD');
    logger.info('');
    logger.info('👷 WORKER CREDENTIALS:');
    logger.info('  [FirstName.LastName]@workers.com.au / REDACTED_SEED_PASSWORD');
    logger.info('');
    logger.info('👤 PARTICIPANT CREDENTIALS:');
    logger.info('  [FirstName.LastName]@participants.com.au / REDACTED_SEED_PASSWORD');
    logger.info('='.repeat(60));

    logger.info('\n📝 NEXT STEPS:');
    logger.info('1. Run roster seeder: npm run seed:roster');
    logger.info('2. Test endpoints with seeded data');
    logger.info('3. Use the comprehensive seeder for more data if needed');

  } catch (error) {
    logger.error('Error displaying summary:', error);
  }
};

/**
 * Main seeding execution function
 */
const runSimplifiedStagingSeeding = async (): Promise<void> => {
  try {
    logger.info('🚀 STARTING SIMPLIFIED STAGING DATABASE SEEDING');
    logger.info('='.repeat(60));

    // Step 1: Connect to database
    await connectDB();

    // Step 2: Seed core user data
    logger.info('👥 Seeding user accounts...');
    await seedAdminUsers();
    await seedSupportWorkers();
    await seedParticipants();
    logger.info('✓ User accounts seeded');

    // Step 3: Display summary
    await displaySeedingSummary();

    // Step 4: Disconnect
    await disconnectDB();

    logger.info('🎉 SIMPLIFIED STAGING SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);

  } catch (error) {
    logger.error('💥 SIMPLIFIED STAGING SEEDING FAILED:', error);

    // Ensure we disconnect even on error
    await disconnectDB();

    process.exit(1);
  }
};

// Export for external use
export { runSimplifiedStagingSeeding };

// Run if called directly
if (require.main === module) {
  runSimplifiedStagingSeeding();
}