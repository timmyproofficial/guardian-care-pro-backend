/**
 * Comprehensive Staging Database Seeder
 *
 * Seeds the GuardianCarePro database with realistic staging data for testing.
 * This seeder creates a fully functional staging environment with interconnected data.
 *
 * IMPORTANT: TWO TYPES OF WORKERS AND PARTICIPANTS
 * 
 * WORKERS:
 * 1. Full User Workers (User + Worker models) - Can authenticate, reference Shift model
 * 2. Provider Registry Workers (WorkerRegistry model) - Belong to providers, reference ShiftReference
 * 
 * PARTICIPANTS:
 * 1. Full User Participants (User + Participant models) - Can authenticate, reference Shift model  
 * 2. Provider Registry Participants (ParticipantRegistry model) - Belong to providers, reference ShiftReference
 *
 * USAGE:
 * 1. npm run seed:roster (creates Type 2: Provider Registry data)
 * 2. npm run seed:staging (creates Type 1: Full User accounts + other data)
 *
 * WHAT IT SEEDS:
 * - Calls existing seeders (locations, services, rate-time-bands)
 * - Creates admin users, full user workers, and full user participants
 * - Creates job postings and applications (with proper regionId, stateId, serviceAreaIds)
 * - Creates shifts and timesheets (references Shift model for full users)
 * - Creates routines and completions
 * - Creates events and registrations
 * - Creates worker compliance records
 * - Sets up user presence/online status
 *
 * SAFETY:
 * - Can be run multiple times safely (idempotent)
 * - Won't overwrite production/business data (avoids invoice/batch models)
 * - Uses realistic Australian data with proper location references
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
// Import location models for job seeding
import '../models/location/state.model';
import '../models/location/region.model';
import '../models/location/serviceArea.model';
import State from '../models/location/state.model';
import Region from '../models/location/region.model';
import ServiceArea from '../models/location/serviceArea.model';
import Suburb from '../models/location/suburb.model';
import User from '../models/user.model';
import Admin from '../models/admin.model';
import Worker from '../models/worker.model';
import Participant from '../models/participant.model';
import Job from '../models/job.model';
import JobApplication from '../models/jobApplication.model';
import SavedJob from '../models/savedJob.model';
import Shift from '../models/shift.model';
import Timesheet from '../models/timesheet.model';
import ServiceType from '../models/serviceType.model';
import RateTimeBand from '../models/rateTimeBand.model';
import Routine from '../models/routine.model';
import RoutineCompletion from '../models/routineCompletion.model';
import Event from '../models/event.model';
import EventRegistration from '../models/eventRegistration.model';
import WorkerCompliance from '../models/workerCompliance.model';
import UserPresence, { UserPresenceStatus } from '../models/userPresence.model';
import Organization from '../models/organization.model';
import Provider from '../models/provider.model';
import WorkerRegistry from '../models/workerRegistry.model';
import ParticipantRegistry from '../models/participantRegistry.model';

// Existing seeders
import { seedLocationData } from './location.seed';
import { seedServiceCategoriesAndTypes } from './serviceCategoriesAndTypes.seed';
import { seedRateTimeBands } from './rateTimeBand.seed';
// Note: roster-snapshot.seed.ts runs directly when executed, not exported

// Types
import { UserRole, UserStatus } from '../types/user.types';
import { SubscriptionTier } from '../types/payment.types';
import { JobStatus, JobType, JobRole } from '../types/job.types';
import { ShiftStatus, ShiftType, LocationType } from '../types/shift.types';
import { TimesheetStatus } from '../types/shift.types';
import { RoutineStatus, RoutineCompletionStatus } from '../types/routine.types';
import { EventStatus, RegistrationStatus } from '../types/event.types';
import { ComplianceStatus, ComplianceDocumentType, REQUIRED_DOCUMENTS } from '../types/compliance.types';

// Utils
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
    logger.info('✓ Connected to MongoDB for staging seeding');
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
 * Clear staging data to make the seeder idempotent.
 * IMPORTANT: This only clears collections that this seeder is responsible for.
 * It does NOT touch invoice/batch/conversation/guardian/etc. collections.
 */
const clearStagingCollections = async (): Promise<void> => {
  logger.info('🧹 Clearing existing staging data (jobs, applications, shifts, routines, etc.)...');

  await Promise.all([
    // Core staging collections seeded here
    Admin.deleteMany({}),
    Worker.deleteMany({}),
    Participant.deleteMany({}),
    Job.deleteMany({}),
    JobApplication.deleteMany({}),
    SavedJob.deleteMany({}),
    Shift.deleteMany({}),
    Timesheet.deleteMany({}),
    Routine.deleteMany({}),
    RoutineCompletion.deleteMany({}),
    Event.deleteMany({}),
    EventRegistration.deleteMany({}),
    WorkerCompliance.deleteMany({}),
    UserPresence.deleteMany({}),
    Organization.deleteMany({}),
  ]);

  logger.info('✓ Staging collections cleared');
};

/**
 * Australian names and data for realistic seeding
 */
const AUSTRALIAN_FIRST_NAMES = [
  'James', 'Olivia', 'William', 'Charlotte', 'Jack', 'Amelia', 'Alexander', 'Isabella',
  'Lachlan', 'Mia', 'Oliver', 'Ava', 'Thomas', 'Grace', 'Ethan', 'Chloe', 'Noah', 'Sofia',
  'Liam', 'Emily', 'Harrison', 'Zoe', 'Lucas', 'Ruby', 'Henry', 'Ella', 'Mason', 'Sophie',
  'Samuel', 'Lily', 'Cooper', 'Madison', 'Hunter', 'Ivy', 'Jacob', 'Scarlett', 'Benjamin',
  'Abigail', 'Levi', 'Harper', 'Owen', 'Eva', 'Elijah', 'Georgia', 'Theodore', 'Isabelle',
  'Finn', 'Aiden', 'Summer', 'Riley', 'Hudson', 'Layla', 'Archer', 'Nora', 'Sebastian',
  'Hannah', 'Luca', 'Savannah', 'Charlie', 'Zara', 'Harvey', 'Stella', 'Kai', 'Violet',
  'Oscar', 'Audrey', 'George', 'Hazel', 'Felix', 'Aurora', 'Asher', 'Nova', 'Jasper', 'Luna'
];

const AUSTRALIAN_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
  'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall',
  'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans',
  'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris',
  'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
  'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson',
  'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price'
];

/**
 * Generate random Australian phone number
 */
const generateAUSPhone = (): string => {
  const prefixes = ['0412', '0413', '0414', '0415', '0416', '0417', '0418', '0419', '0421', '0422'];
  const suffix = Math.floor(Math.random() * 900000) + 100000;
  return `+61${prefixes[Math.floor(Math.random() * prefixes.length)].substring(1)}${suffix}`;
};

/**
 * Generate random Australian address
 */
const generateAUAddress = () => {
  const streets = [
    'George Street', 'Pitt Street', 'Elizabeth Street', 'Collins Street', 'Flinders Street',
    'Queen Street', 'Adelaide Street', 'Albert Street', 'William Street', 'Mary Street',
    'Smith Street', 'High Street', 'Church Street', 'Victoria Street', 'Oxford Street'
  ];

  const suburbs = [
    'Sydney CBD', 'Melbourne CBD', 'Brisbane CBD', 'Perth CBD', 'Adelaide CBD',
    'Newcastle', 'Wollongong', 'Geelong', 'Townsville', 'Cairns', 'Toowoomba', 'Ballarat',
    'Bendigo', 'Launceston', 'Hobart', 'Alice Springs', 'Darwin', 'Katherine'
  ];

  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

  return {
    street: `${Math.floor(Math.random() * 500) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
    city: suburbs[Math.floor(Math.random() * suburbs.length)],
    state: states[Math.floor(Math.random() * states.length)],
    postcode: String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')
  };
};

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
        status: UserStatus.ACTIVE,
        phone: generateAUSPhone(),
        isEmailVerified: true,
        adminType: 'superAdmin',
        permissions: {
          canManageUsers: true,
          canManageWorkers: true,
          canManageParticipants: true,
          canApproveInvites: true,
          canManageServiceAgreements: true,
          canManageSubscriptions: true,
          canAccessFinancials: true,
          canManageAdmins: true
        }
      },
      {
        email: 'manager@guardiance.com',
        password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
        firstName: 'Operations',
        lastName: 'Manager',
        status: UserStatus.ACTIVE,
        phone: generateAUSPhone(),
        isEmailVerified: true,
        adminType: 'coordinator',
        permissions: {
          canManageUsers: true,
          canManageWorkers: true,
          canManageParticipants: true,
          canApproveInvites: true,
          canManageServiceAgreements: false,
          canManageSubscriptions: false,
          canAccessFinancials: false,
          canManageAdmins: false
        }
      }
    ];

    for (const adminData of adminUsers) {
      const existingUser = await Admin.findOne({ email: adminData.email });
      if (!existingUser) {
        await Admin.create(adminData);
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
 * Get existing providers from roster seeding
 */
const getExistingProviders = async () => {
  return await Provider.find({}).select('_id organizationName');
};

/**
 * Get existing workers from worker registry
 */
const getExistingWorkers = async () => {
  return await WorkerRegistry.find({}).select('_id workerName phone email');
};

/**
 * Get existing participants from participant registry
 */
const getExistingParticipants = async () => {
  return await ParticipantRegistry.find({}).select('_id participantName phone');
};

/**
 * IMPORTANT: Two Types of Workers in the System
 * 
 * 1. FULL USER WORKERS (User + Worker models):
 *    - Can authenticate and log into the app
 *    - Reference Shift model for their work
 *    - Independent workers with full user accounts
 * 
 * 2. PROVIDER REGISTRY WORKERS (WorkerRegistry model only):
 *    - Belong to specific providers
 *    - Reference ShiftReference model
 *    - Created via roster-snapshot.seed.ts
 *    - Lightweight worker entries without full user accounts
 * 
 * This function creates TYPE 1: Full User Workers
 */
const seedSupportWorkers = async (): Promise<void> => {
  try {
    logger.info('Seeding support workers (full User accounts)...');

    // Get location data for proper referencing
    const states = await State.find({ isActive: true }).limit(8);
    const regions = await Region.find({ isActive: true }).limit(20);
    const serviceAreas = await ServiceArea.find({ isActive: true }).limit(50);

    if (states.length === 0) {
      logger.warn('No states found. Skipping support worker seeding.');
      return;
    }

    const workerNames = [
      'Sarah Johnson', 'Michael Chen', 'Emma Williams', 'David Brown', 'Lisa Taylor',
      'James Wilson', 'Rachel Davis', 'Tom Anderson', 'Amy Martinez', 'Chris Thompson',
      'Jessica Lee', 'Mark Robinson', 'Sophie Clark', 'Daniel Lewis', 'Olivia Walker',
      'Ryan Hall', 'Grace Allen', 'Luke Young', 'Mia King', 'Alex Wright',
      'Chloe Green', 'Noah Adams', 'Ella Baker', 'Mason Miller', 'Zoe Garcia'
    ];

    for (let i = 0; i < workerNames.length; i++) {
      const fullName = workerNames[i];
      const [firstName, lastName] = fullName.split(' ');
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@workers.com.au`;

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        // Select random location data
        const state = states[Math.floor(Math.random() * states.length)];
        const stateRegions = regions.filter(r => r.stateId.toString() === (state as any)._id.toString());
        const region = stateRegions.length > 0 ? stateRegions[Math.floor(Math.random() * stateRegions.length)] : regions[0];
        const regionServiceAreas = serviceAreas.filter(sa => sa.regionId.toString() === (region as any)._id.toString());
        const selectedServiceAreas = regionServiceAreas.slice(0, Math.floor(Math.random() * 3) + 1);

        const address = generateAUAddress();
        const workerData = {
          email,
          password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
          phone: generateAUSPhone(),
          dateOfBirth: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          isEmailVerified: true,
          address: `${address.street}, ${address.city}, ${address.state} ${address.postcode}`,
          
          // Location references for Worker model
          stateIds: [state._id],
          regionIds: [region._id],
          serviceAreaIds: selectedServiceAreas.map(sa => sa._id),
          
          qualifications: ['First Aid', 'NDIS Worker Screening', 'Certificate III in Individual Support'],
          experience: Math.floor(Math.random() * 10) + 1,
          shiftRates: {
            weekday: 35 + Math.floor(Math.random() * 15),
            weekend: 45 + Math.floor(Math.random() * 15),
            publicHoliday: 55 + Math.floor(Math.random() * 15)
          },
          availability: {
            monday: { isAvailable: Math.random() > 0.3, startTime: '09:00', endTime: '17:00' },
            tuesday: { isAvailable: Math.random() > 0.3, startTime: '09:00', endTime: '17:00' },
            wednesday: { isAvailable: Math.random() > 0.3, startTime: '09:00', endTime: '17:00' },
            thursday: { isAvailable: Math.random() > 0.3, startTime: '09:00', endTime: '17:00' },
            friday: { isAvailable: Math.random() > 0.3, startTime: '09:00', endTime: '17:00' },
            saturday: { isAvailable: Math.random() > 0.5, startTime: '10:00', endTime: '16:00' },
            sunday: { isAvailable: Math.random() > 0.7, startTime: '10:00', endTime: '16:00' }
          },
          travelRadiusKm: 25 + Math.floor(Math.random() * 25),
          hasVehicle: Math.random() > 0.2,
          isActive: true
        };

        await Worker.create(workerData);
        logger.info(`✓ Created support worker: ${firstName} ${lastName}`);
      }
    }

    logger.info('✓ Support workers (full User accounts) seeded successfully');
  } catch (error) {
    logger.error('Error seeding support workers:', error);
    throw error;
  }
};

/**
 * IMPORTANT: Two Types of Participants in the System
 * 
 * 1. FULL USER PARTICIPANTS (User + Participant models):
 *    - Can authenticate and log into the app
 *    - Reference Shift model for their services
 *    - Independent participants with full user accounts
 * 
 * 2. PROVIDER REGISTRY PARTICIPANTS (ParticipantRegistry model only):
 *    - Belong to specific providers
 *    - Reference ShiftReference model
 *    - Created via roster-snapshot.seed.ts
 *    - Lightweight participant entries without full user accounts
 * 
 * This function creates TYPE 1: Full User Participants
 */
const seedParticipants = async (): Promise<void> => {
  try {
    logger.info('Seeding participants (full User accounts)...');

    // Get location data for proper referencing
    const states = await State.find({ isActive: true }).limit(8);
    const regions = await Region.find({ isActive: true }).limit(20);
    const suburbs = await Suburb.find({ isActive: true }).limit(100);

    if (states.length === 0) {
      logger.warn('No states found. Skipping participant seeding.');
      return;
    }

    const participantNames = [
      'Mary Johnson', 'Robert Smith', 'Patricia Brown', 'John Davis', 'Jennifer Wilson',
      'Michael Miller', 'Linda Moore', 'William Taylor', 'Elizabeth Anderson', 'David Thomas',
      'Barbara Jackson', 'Richard White', 'Susan Harris', 'Joseph Martin', 'Jessica Thompson',
      'Thomas Garcia', 'Sarah Martinez', 'Christopher Robinson', 'Nancy Clark', 'Daniel Rodriguez',
      'Lisa Lewis', 'Matthew Lee', 'Helen Walker', 'Anthony Hall', 'Dorothy Allen'
    ];

    for (let i = 0; i < participantNames.length; i++) {
      const fullName = participantNames[i];
      const [firstName, lastName] = fullName.split(' ');
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@participants.com.au`;

      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        // Select random location data
        const state = states[Math.floor(Math.random() * states.length)];
        const stateRegions = regions.filter(r => r.stateId.toString() === (state as any)._id.toString());
        const region = stateRegions.length > 0 ? stateRegions[Math.floor(Math.random() * stateRegions.length)] : regions[0];
        const stateSuburbs = suburbs.filter(s => s.stateId.toString() === (state as any)._id.toString());
        const suburb = stateSuburbs.length > 0 ? stateSuburbs[Math.floor(Math.random() * stateSuburbs.length)] : suburbs[0];

        const address = generateAUAddress();
        const participantData = {
          email,
          password: await bcrypt.hash('REDACTED_SEED_PASSWORD', 10),
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
          phone: generateAUSPhone(),
          isEmailVerified: true,
          dateOfBirth: new Date(1950 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          
          // Location references for Participant model
          stateId: state._id,
          regionId: region._id,
          suburbId: suburb ? suburb._id : undefined,
          
          supportNeeds: ['Personal Care', 'Community Participation', 'Transport'],
          serviceCategories: [],
          emergencyContact: {
            name: `${firstName} Emergency Contact`,
            relationship: 'Family Member',
            phone: generateAUSPhone()
          },
          planManager: {
            name: 'NDIS Plan Manager',
            email: 'plan.manager@ndis.gov.au'
          },
          subscription: {
            tier: SubscriptionTier.BASIC,
            startDate: new Date(),
            isActive: true,
            autoRenew: true
          },
          supportCoordinators: [],
          preferredLanguages: ['English'],
          requiresSupervision: Math.random() > 0.7,
          onboardingComplete: true,
          address: `${address.street}, ${address.city}, ${address.state} ${address.postcode}`
        };

        await Participant.create(participantData);
        logger.info(`✓ Created participant: ${firstName} ${lastName}`);
      }
    }

    logger.info('✓ Participants (full User accounts) seeded successfully');
  } catch (error) {
    logger.error('Error seeding participants:', error);
    throw error;
  }
};

/**
 * Seed job postings
 */
const seedJobs = async (): Promise<void> => {
  try {
    logger.info('Seeding job postings...');

    const providers = await getExistingProviders();
    const participants = await Participant.find({}).limit(10);

    // Get some location data for proper state/region IDs
    const states = await mongoose.model('State').find({}).limit(5);
    const regions = await mongoose.model('Region').find({}).limit(10);

    const jobTitles = [
      'Personal Care Assistant', 'Support Worker', 'Community Access Worker',
      'Respite Care Provider', 'Daily Living Support Worker', 'Therapy Assistant',
      'Household Help', 'Transport Assistant', 'Meal Preparation Support'
    ];

    const jobDescriptions = [
      'Provide personal care and support services to participants with disabilities.',
      'Assist with daily living activities and community participation.',
      'Help participants access community services and recreational activities.',
      'Provide respite care for families of participants with high support needs.',
      'Support participants with daily living skills and independence.',
      'Assist with therapy sessions and rehabilitation activities.',
      'Help with household tasks and home maintenance.',
      'Provide transport assistance for medical appointments and community activities.',
      'Support with meal preparation and nutrition.'
    ];

    const keyResponsibilities = [
      'Assist participants with personal care activities including bathing, dressing, and grooming',
      'Provide companionship and emotional support to participants',
      'Help with meal preparation, shopping, and household tasks',
      'Accompany participants to appointments and community activities',
      'Administer medications and monitor health conditions',
      'Document care activities and maintain accurate records',
      'Communicate with family members and healthcare providers',
      'Maintain a safe and clean environment for participants'
    ];

    const jobs = [];
    for (let i = 0; i < 30; i++) {
      const participant = participants[Math.floor(Math.random() * participants.length)];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const state = states[Math.floor(Math.random() * states.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];

      const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      const description = jobDescriptions[Math.floor(Math.random() * jobDescriptions.length)];
      const responsibilities = keyResponsibilities.slice(0, Math.floor(Math.random() * 3) + 3).join('\n- ');

      const location = generateAUAddress();
      const locationString = `${location.street}, ${location.city}, ${location.state} ${location.postcode}`;

      const jobData = {
        postedBy: participant._id,
        postedByType: 'participant',
        jobRole: JobRole.SUPPORT_WORKER,
        jobDescription: description,
        keyResponsibilities: `- ${responsibilities}`,
        requiredCompetencies: {
          rightToWorkInAustralia: Math.random() > 0.1,
          ndisWorkerScreeningCheck: Math.random() > 0.1,
          wwcc: Math.random() > 0.2,
          policeCheck: Math.random() > 0.1,
          firstAid: Math.random() > 0.3,
          cpr: Math.random() > 0.3,
          ahpraRegistration: Math.random() > 0.8,
          professionalIndemnityInsurance: Math.random() > 0.7,
          covidVaccinationStatus: Math.random() > 0.1
        },
        location: locationString,
        stateId: state._id,
        regionId: region._id,
        price: 25 + Math.floor(Math.random() * 15), // $25-40/hour
        jobType: [JobType.FULL_TIME, JobType.PART_TIME, JobType.CASUAL][Math.floor(Math.random() * 3)],
        status: [JobStatus.ACTIVE, JobStatus.ACTIVE, JobStatus.ACTIVE, JobStatus.CLOSED, JobStatus.DRAFT][Math.floor(Math.random() * 5)],
        applicationDeadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Next 30 days
        applicationCount: 0,
        isDeleted: false
      };

      jobs.push(jobData);
    }

    await Job.insertMany(jobs);
    logger.info(`✓ Created ${jobs.length} job postings`);
  } catch (error) {
    logger.error('Error seeding jobs:', error);
    throw error;
  }
};

/**
 * Seed job applications
 */
const seedJobApplications = async (): Promise<void> => {
  try {
    logger.info('Seeding job applications...');

    const jobs = await Job.find({ status: JobStatus.ACTIVE }).limit(20);
    const workers = await Worker.find({}).limit(15);

    const applications = [];
    for (const job of jobs) {
      // Each job gets 1-3 applications
      const numApplications = Math.floor(Math.random() * 3) + 1;
      const selectedWorkers = workers.sort(() => 0.5 - Math.random()).slice(0, numApplications);

      for (const worker of selectedWorkers) {
        // Generate application data with required fields
        const fullName = `${worker.firstName} ${worker.lastName}`;
        const email = worker.email;
        const phone = worker.phone;
        const location = worker.address || generateAUAddress().city;

        const applicationData = {
          jobId: job._id,
          applicantId: worker._id,
          fullName,
          email,
          phone,
          location,
          attachments: [
            {
              fieldName: 'resume',
              fileName: `${fullName.replace(/\s+/g, '_')}_Resume.pdf`,
              fileUrl: `https://example.com/uploads/resumes/${Math.random().toString(36).substring(2, 10)}.pdf`,
              fileType: 'application/pdf',
              fileSize: 1024000 + Math.floor(Math.random() * 2048000), // 1-3 MB
              uploadedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          ],
          status: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'][Math.floor(Math.random() * 5)],
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
          updatedAt: new Date(),
          isDeleted: false
        };

        applications.push(applicationData);
      }
    }

    await JobApplication.insertMany(applications);
    logger.info(`✓ Created ${applications.length} job applications`);
  } catch (error) {
    logger.error('Error seeding job applications:', error);
    throw error;
  }
};

/**
 * Seed saved jobs
 */
const seedSavedJobs = async (): Promise<void> => {
  try {
    logger.info('Seeding saved jobs...');

    const jobs = await Job.find({ status: JobStatus.ACTIVE }).limit(15);
    const workers = await Worker.find({}).limit(10);

    const savedJobs = [];
    for (const worker of workers) {
      // Each worker saves 1-3 jobs
      const numSaved = Math.floor(Math.random() * 3) + 1;
      const selectedJobs = jobs.sort(() => 0.5 - Math.random()).slice(0, numSaved);

      for (const job of selectedJobs) {
        const savedJobData = {
          jobId: job._id,
          userId: worker._id,
          savedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) // Last 14 days
        };

        savedJobs.push(savedJobData);
      }
    }

    await SavedJob.insertMany(savedJobs);
    logger.info(`✓ Created ${savedJobs.length} saved jobs`);
  } catch (error) {
    logger.error('Error seeding saved jobs:', error);
    throw error;
  }
};

/**
 * Seed shifts
 */
const seedShifts = async (): Promise<void> => {
  try {
    logger.info('Seeding shifts...');

    const workers = await Worker.find({}).limit(15);
    const participants = await Participant.find({}).limit(10);
    const providers = await getExistingProviders();
    
    // Get service types for shifts
    const serviceTypes = await ServiceType.find({}).limit(5);
    if (serviceTypes.length === 0) {
      logger.warn('No service types found. Skipping shift seeding.');
      return;
    }

    const shifts = [];
    for (let i = 0; i < 50; i++) {
      const worker = workers[Math.floor(Math.random() * workers.length)];
      const participant = participants[Math.floor(Math.random() * participants.length)];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];

      // Create shifts for past and future dates
      const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
      const shiftDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

      const startHour = 8 + Math.floor(Math.random() * 10); // 8 AM to 6 PM
      const duration = 4 + Math.floor(Math.random() * 8); // 4-12 hours
      
      // Create Date objects for startTime and endTime
      const startTime = new Date(shiftDate);
      startTime.setHours(startHour, 0, 0, 0);
      
      const endTime = new Date(shiftDate);
      endTime.setHours(startHour + duration, 0, 0, 0);

      const address = generateAUAddress();
      const addressString = `${address.street}, ${address.city}, ${address.state} ${address.postcode}`;

      const shiftData = {
        workerId: worker._id,
        participantId: participant._id,
        organizationId: provider._id,
        serviceTypeId: serviceType._id,
        startTime,
        endTime,
        shiftType: ShiftType.DIRECT_BOOKING,
        locationType: LocationType.IN_PERSON,
        address: addressString,
        isMultiWorkerShift: false,
        requiresSupervision: Math.random() > 0.8,
        specialInstructions: `Support shift for ${participant.firstName}. Please arrive 10 minutes early.`,
        status: shiftDate < new Date() ? ShiftStatus.COMPLETED : ShiftStatus.CONFIRMED,
        routineRequired: Math.random() > 0.7
      };

      shifts.push(shiftData);
    }

    await Shift.insertMany(shifts);
    logger.info(`✓ Created ${shifts.length} shifts`);
  } catch (error) {
    logger.error('Error seeding shifts:', error);
    throw error;
  }
};

/**
 * Seed timesheets for completed shifts
 */
const seedTimesheets = async (): Promise<void> => {
  try {
    logger.info('Seeding timesheets...');

    const completedShifts = await Shift.find({ status: ShiftStatus.COMPLETED }).limit(30);
    
    // Get rate time bands for calculations
    const rateTimeBands = await RateTimeBand.find({ isActive: true }).limit(3);
    if (rateTimeBands.length === 0) {
      logger.warn('No active rate time bands found. Skipping timesheet seeding.');
      return;
    }

    const timesheets = [];
    for (const shift of completedShifts) {
      // Add some variation for actual times
      const actualStart = new Date(shift.startTime.getTime() + Math.random() * 30 * 60 * 1000); // ±30 minutes
      const actualEnd = new Date(shift.endTime.getTime() + Math.random() * 60 * 60 * 1000); // ±60 minutes

      // Calculate shift duration in hours
      const shiftDurationMs = actualEnd.getTime() - actualStart.getTime();
      const shiftHours = shiftDurationMs / (1000 * 60 * 60);

      // Select a random rate time band
      const rateTimeBand = rateTimeBands[Math.floor(Math.random() * rateTimeBands.length)];
      const baseHourlyRate = 35; // Base rate in AUD
      const hourlyRate = baseHourlyRate * rateTimeBand.baseRateMultiplier;
      
      // Calculate rate breakdown
      const serviceAmount = hourlyRate * shiftHours;
      const distanceTravelKm = Math.floor(Math.random() * 50) + 5; // 5-55 km
      const distanceTravelRate = 0.85; // Standard Australian rate
      const distanceTravelAmount = distanceTravelKm * distanceTravelRate;
      
      // Create rate calculation
      const rateCalculations = [{
        rateTimeBandId: rateTimeBand._id,
        name: rateTimeBand.name,
        hourlyRate: hourlyRate,
        hours: shiftHours,
        amount: serviceAmount
      }];

      // Calculate totals
      const subtotal = serviceAmount;
      const totalAmount = subtotal + distanceTravelAmount;
      const totalExpenses = 0; // No expenses for simplicity
      const grandTotal = totalAmount + totalExpenses;

      const timesheetData = {
        shiftId: shift._id,
        shiftIdRef: `SHIFT-${shift._id.toString().slice(-8)}`,
        organizationId: shift.organizationId,
        participantId: shift.participantId,
        workerId: shift.workerId,
        isMultiWorkerShift: false,
        scheduledStartTime: shift.startTime,
        scheduledEndTime: shift.endTime,
        actualStartTime: actualStart,
        actualEndTime: actualEnd,
        extraTime: Math.max(0, Math.floor((actualEnd.getTime() - shift.endTime.getTime()) / (1000 * 60))),
        distanceTravelKm,
        distanceTravelRate,
        distanceTravelAmount,
        notes: 'Shift completed successfully',
        expenses: [],
        participantExpensesTotal: 0,
        workerExpensesTotal: 0,
        totalExpenses,
        rateCalculations,
        subtotal,
        totalAmount,
        grandTotal,
        status: [TimesheetStatus.PENDING, TimesheetStatus.APPROVED, TimesheetStatus.PROCESSED][Math.floor(Math.random() * 3)],
        isPaid: Math.random() > 0.7
      };

      timesheets.push(timesheetData);
    }

    await Timesheet.insertMany(timesheets);
    logger.info(`✓ Created ${timesheets.length} timesheets`);
  } catch (error) {
    logger.error('Error seeding timesheets:', error);
    throw error;
  }
};

/**
 * Seed routines for participants
 */
const seedRoutines = async (): Promise<void> => {
  try {
    logger.info('Seeding participant routines...');

    const participants = await User.find({ role: UserRole.PARTICIPANT }).limit(15);

    const routineTypes = [
      'Morning Hygiene', 'Meal Preparation', 'Medication Management',
      'Household Chores', 'Exercise', 'Social Activities', 'Shopping'
    ];

    const routines = [];
    for (const participant of participants) {
      // Each participant gets 3-5 routines
      const numRoutines = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < numRoutines; i++) {
        const routineData = {
          name: routineTypes[Math.floor(Math.random() * routineTypes.length)],
          description: 'Regular support routine for daily living',
          participantId: participant._id,
          organizationId: participant._id, // Will be updated with proper org ID
          status: RoutineStatus.ACTIVE,
          tasks: [
            {
              title: 'Complete routine task',
              description: 'Perform the required care activity'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        routines.push(routineData);
      }
    }

    await Routine.insertMany(routines);
    logger.info(`✓ Created ${routines.length} routines`);
  } catch (error) {
    logger.error('Error seeding routines:', error);
    throw error;
  }
};

/**
 * Seed routine completions
 */
const seedRoutineCompletions = async (): Promise<void> => {
  try {
    logger.info('Seeding routine completions...');

    const routines = await Routine.find({ status: RoutineStatus.ACTIVE }).limit(30);

    const completions = [];
    const recentShifts = await Shift.find({
      status: ShiftStatus.COMPLETED,
      shiftDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).limit(50);

    for (const routine of routines.slice(0, 30)) { // Limit to 30 routines for performance
      // Find shifts that could be associated with this routine's participant
      const participantShifts = recentShifts.filter(shift =>
        shift.participantId.toString() === routine.participantId.toString()
      );

      if (participantShifts.length > 0) {
        // Create 1-3 completions per routine
        const numCompletions = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numCompletions; i++) {
          const randomShift = participantShifts[Math.floor(Math.random() * participantShifts.length)];
          const completionDate = randomShift.startTime;

          const completionData = {
            shiftId: randomShift._id,
            routineId: routine._id,
            workerId: randomShift.workerId,
            participantId: routine.participantId,
            organizationId: randomShift.organizationId,
            status: [RoutineCompletionStatus.COMPLETED, RoutineCompletionStatus.COMPLETED, RoutineCompletionStatus.NOT_STARTED][Math.floor(Math.random() * 3)],
            completedAt: Math.random() > 0.2 ? completionDate : undefined,
            completionPercentage: Math.random() > 0.2 ? 100 : 0,
            overallNotes: Math.random() > 0.7 ? 'Routine completed as scheduled' : undefined
          };

          completions.push(completionData);
        }
      }
    }

    await RoutineCompletion.insertMany(completions);
    logger.info(`✓ Created ${completions.length} routine completions`);
  } catch (error) {
    logger.error('Error seeding routine completions:', error);
    throw error;
  }
};

/**
 * Seed events
 */
const seedEvents = async (): Promise<void> => {
  try {
    logger.info('Seeding events...');

    const providers = await getExistingProviders();

    const eventTitles = [
      'Community Picnic', 'Art Therapy Workshop', 'Music Appreciation Session',
      'Cooking Class', 'Garden Club Meeting', 'Movie Night', 'Exercise Group',
      'Book Club', 'Craft Workshop', 'Social Games Afternoon'
    ];

    const eventDescriptions = [
      'Join us for a fun community picnic with games and activities.',
      'Express yourself through art in this therapeutic workshop.',
      'Enjoy live music and learn about different genres.',
      'Learn to prepare healthy meals and snacks.',
      'Tend to our community garden and enjoy nature.',
      'Relax with a selection of classic and modern films.',
      'Stay active with guided exercise sessions.',
      'Discuss and share your favorite books.',
      'Create beautiful crafts and artworks.',
      'Play games and socialize with fellow participants.'
    ];

    const events = [];
    for (let i = 0; i < 20; i++) {
      const provider = providers[Math.floor(Math.random() * providers.length)];

      const eventData = {
        eventName: eventTitles[Math.floor(Math.random() * eventTitles.length)],
        eventDescr: eventDescriptions[Math.floor(Math.random() * eventDescriptions.length)],
        status: EventStatus.PUBLISHED,
        createdBy: provider._id,
        eventLocation: generateAUAddress().street + ', ' + generateAUAddress().city,
        eventStartDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Next 30 days
        eventEndDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        eventStartTime: '10:00',
        eventEndTime: '12:00',
        registrationCount: 0,
        isDeleted: false
      };

      events.push(eventData);
    }

    await Event.insertMany(events);
    logger.info(`✓ Created ${events.length} events`);
  } catch (error) {
    logger.error('Error seeding events:', error);
    throw error;
  }
};

/**
 * Seed event registrations
 */
const seedEventRegistrations = async (): Promise<void> => {
  try {
    logger.info('Seeding event registrations...');

    const events = await Event.find({ status: EventStatus.PUBLISHED, isDeleted: false }).limit(15);
    const participants = await Participant.find({}).limit(20);

    const registrations = [];
    for (const event of events) {
      // Each event gets 3-8 registrations
      const numRegistrations = Math.floor(Math.random() * 6) + 3;
      const selectedParticipants = participants.sort(() => 0.5 - Math.random()).slice(0, numRegistrations);

      for (const participant of selectedParticipants) {
        const registrationData = {
          eventId: event._id,
          userId: participant._id,
          fullName: `${participant.firstName} ${participant.lastName}`,
          email: participant.email,
          phone: participant.phone || generateAUSPhone(),
          location: participant.firstName, // Using firstName as location for simplicity
          reason: 'Interested in community activities',
          status: [RegistrationStatus.PENDING, RegistrationStatus.ACCEPTED, RegistrationStatus.REJECTED][Math.floor(Math.random() * 3)]
        };

        registrations.push(registrationData);

        // Update event registration count
        await Event.findByIdAndUpdate(event._id, {
          $inc: { registrationCount: 1 }
        });
      }
    }

    await EventRegistration.insertMany(registrations);
    logger.info(`✓ Created ${registrations.length} event registrations`);
  } catch (error) {
    logger.error('Error seeding event registrations:', error);
    throw error;
  }
};

/**
 * Seed worker compliance records
 */
const seedWorkerCompliance = async (): Promise<void> => {
  try {
    logger.info('Seeding worker compliance records...');

    const workers = await User.find({ role: UserRole.SUPPORT_WORKER }).limit(20);

    const complianceTypes = [
      ComplianceDocumentType.POLICE_CHECK, ComplianceDocumentType.WWCC,
      ComplianceDocumentType.FIRST_AID_CERTIFICATE, ComplianceDocumentType.CPR_CERTIFICATE,
      ComplianceDocumentType.RELEVANT_DOCUMENT, ComplianceDocumentType.RELEVANT_INSURANCE
    ];

    const complianceRecords = [];
    for (const worker of workers) {
      // Create compliance answers
      const complianceAnswers = {
        ndisWorkerScreeningCheck: Math.random() > 0.1,
        ndisWorkerOrientationModule: Math.random() > 0.1,
        nationalPoliceCheck: Math.random() > 0.1,
        workingWithChildrenCheck: Math.random() > 0.2,
        firstAidCertification: Math.random() > 0.3,
        cprCertification: Math.random() > 0.3,
        covidVaccinationEvidence: Math.random() > 0.1,
        influenzaVaccinationEvidence: Math.random() > 0.1,
        relevantQualifications: Math.random() > 0.2,
        ndisCodeOfConductAgreement: Math.random() > 0.1,
        manualHandlingTraining: Math.random() > 0.3,
        medicationAdministrationTraining: Math.random() > 0.4,
        infectionControlTraining: Math.random() > 0.3,
        publicLiabilityInsurance: Math.random() > 0.1
      };

      // Create documents array
      const documents = [];
      const numDocs = Math.floor(Math.random() * 4) + 2; // 2-6 documents
      const selectedTypes = complianceTypes.sort(() => 0.5 - Math.random()).slice(0, numDocs);

      for (const docType of selectedTypes) {
        const expiryDate = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000); // Next year

        const document = {
          type: docType,
          url: `https://example.com/documents/${Math.random().toString(36).substring(2, 10)}.pdf`,
          uploadedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Last 6 months
          expiryDate,
          isRequired: REQUIRED_DOCUMENTS.includes(docType)
        };

        documents.push(document);
      }

      const complianceData = {
        workerId: worker._id,
        documents,
        complianceAnswers,
        status: [ComplianceStatus.APPROVED, ComplianceStatus.APPROVED, ComplianceStatus.PENDING, ComplianceStatus.REJECTED][Math.floor(Math.random() * 4)],
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        reviewedAt: Math.random() > 0.5 ? new Date() : undefined,
        adminNotes: Math.random() > 0.7 ? 'All documents verified successfully' : undefined
      };

      complianceRecords.push(complianceData);
    }

    await WorkerCompliance.insertMany(complianceRecords);
    logger.info(`✓ Created ${complianceRecords.length} worker compliance records`);
  } catch (error) {
    logger.error('Error seeding worker compliance:', error);
    throw error;
  }
};

/**
 * Seed user presence/online status
 */
const seedUserPresence = async (): Promise<void> => {
  try {
    logger.info('Seeding user presence records...');

    const users = await User.find({
      role: { $in: [UserRole.SUPPORT_WORKER, UserRole.PARTICIPANT] }
    }).limit(30);

    const presenceRecords = [];
    for (const user of users) {
      const presenceData = {
        userId: user._id,
        status: [UserPresenceStatus.ONLINE, UserPresenceStatus.AWAY, UserPresenceStatus.BUSY, UserPresenceStatus.OFFLINE][Math.floor(Math.random() * 4)],
        lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24 hours
        deviceInfo: {
          platform: ['web', 'mobile'][Math.floor(Math.random() * 2)],
          userAgent: 'Mozilla/5.0 (staging-seeder)',
          ipAddress: '127.0.0.1'
        },
        isTyping: [],
        customStatus: Math.random() > 0.8 ? 'Available for shifts' : undefined
      };

      presenceRecords.push(presenceData);
    }

    await UserPresence.insertMany(presenceRecords);
    logger.info(`✓ Created ${presenceRecords.length} user presence records`);
  } catch (error) {
    logger.error('Error seeding user presence:', error);
    throw error;
  }
};

/**
 * Seed additional organizations
 */
const seedOrganizations = async (): Promise<void> => {
  try {
    logger.info('Seeding additional organizations...');

    const organizationNames = [
      'Community Health Services', 'Independent Living Centre', 'Disability Advocacy Group',
      'Mental Health Support Network', 'Aged Care Alliance', 'Rehabilitation Services Inc',
      'Wellness Community Hub', 'Support Services Collective', 'Care Coordination Network'
    ];

    const organizations = [];
    for (let i = 0; i < 10; i++) {
      const orgData = {
        name: organizationNames[Math.floor(Math.random() * organizationNames.length)],
        description: 'Providing comprehensive support services to the community',
        type: 'NON_PROFIT',
        address: generateAUAddress(),
        contactEmail: `info${i}@organization.com.au`,
        contactPhone: generateAUSPhone(),
        website: `https://organization${i}.com.au`,
        status: 'ACTIVE',
        establishedDate: new Date(2000 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
      };

      organizations.push(orgData);
    }

    await Organization.insertMany(organizations);
    logger.info(`✓ Created ${organizations.length} organizations`);
  } catch (error) {
    logger.error('Error seeding organizations:', error);
    throw error;
  }
};

/**
 * Display seeding summary
 */
const displaySeedingSummary = async (): Promise<void> => {
  try {
    logger.info('\n' + '='.repeat(60));
    logger.info('🎉 STAGING DATABASE SEEDING COMPLETE');
    logger.info('='.repeat(60));

    const [
      userCount, adminCount, workerCount, participantCount,
      jobCount, applicationCount, savedJobCount,
      shiftCount, timesheetCount,
      routineCount, completionCount,
      eventCount, registrationCount,
      complianceCount, presenceCount,
      organizationCount
    ] = await Promise.all([
      User.countDocuments(),
      Admin.countDocuments(),
      Worker.countDocuments(),
      Participant.countDocuments(),
      Job.countDocuments(),
      JobApplication.countDocuments(),
      SavedJob.countDocuments(),
      Shift.countDocuments(),
      Timesheet.countDocuments(),
      Routine.countDocuments(),
      RoutineCompletion.countDocuments(),
      Event.countDocuments(),
      EventRegistration.countDocuments(),
      WorkerCompliance.countDocuments(),
      UserPresence.countDocuments(),
      Organization.countDocuments()
    ]);

    logger.info(`👥 Total Users: ${userCount}`);
    logger.info(`  └─ Admins: ${adminCount}`);
    logger.info(`  └─ Support Workers: ${workerCount}`);
    logger.info(`  └─ Participants: ${participantCount}`);
    logger.info('');
    logger.info(`💼 Jobs: ${jobCount}`);
    logger.info(`  └─ Applications: ${applicationCount}`);
    logger.info(`  └─ Saved Jobs: ${savedJobCount}`);
    logger.info('');
    logger.info(`📅 Shifts: ${shiftCount}`);
    logger.info(`  └─ Timesheets: ${timesheetCount}`);
    logger.info('');
    logger.info(`📋 Routines: ${routineCount}`);
    logger.info(`  └─ Completions: ${completionCount}`);
    logger.info('');
    logger.info(`🎪 Events: ${eventCount}`);
    logger.info(`  └─ Registrations: ${registrationCount}`);
    logger.info('');
    logger.info(`✅ Worker Compliance: ${complianceCount}`);
    logger.info(`🔴 User Presence: ${presenceCount}`);
    logger.info(`🏢 Organizations: ${organizationCount}`);

    logger.info('\n' + '='.repeat(60));
    logger.info('📋 ADMIN CREDENTIALS:');
    logger.info('  admin@guardiance.com / REDACTED_SEED_PASSWORD');
    logger.info('  manager@guardiance.com / REDACTED_SEED_PASSWORD');
    logger.info('');
    logger.info('👷 WORKER CREDENTIALS:');
    logger.info('  [WorkerName]@workers.com.au / REDACTED_SEED_PASSWORD');
    logger.info('');
    logger.info('👤 PARTICIPANT CREDENTIALS:');
    logger.info('  [ParticipantName]@participants.com.au / REDACTED_SEED_PASSWORD');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Error displaying summary:', error);
  }
};

/**
 * Main seeding execution function
 */
const runStagingSeeding = async (): Promise<void> => {
  try {
    logger.info('🚀 STARTING COMPREHENSIVE STAGING DATABASE SEEDING');
    logger.info('='.repeat(60));

    // Step 1: Connect to database
    await connectDB();

    // Step 2: Clear existing staging data (idempotent seeding)
    await clearStagingCollections();

    // Step 3: Run existing seeders first
    logger.info('📦 Running existing seeders...');
    await seedLocationData();
    await seedServiceCategoriesAndTypes();
    await seedRateTimeBands();
    logger.info('✓ Existing seeders completed');
    logger.info('⚠️  IMPORTANT: Run roster snapshot seeder separately: npm run seed:roster');
    logger.info('📋 This creates Provider Registry Workers/Participants (Type 2) that reference ShiftReference');
    logger.info('📋 The following steps create Full User Workers/Participants (Type 1) that reference Shift');

    // Step 4: Seed core user data
    logger.info('👥 Seeding user accounts...');
    await seedAdminUsers();
    await seedSupportWorkers();
    await seedParticipants();
    logger.info('✓ User accounts seeded');

    // Step 5: Seed job-related data
    logger.info('💼 Seeding job ecosystem...');
    await seedJobs();
    await seedJobApplications();
    await seedSavedJobs();
    logger.info('✓ Job ecosystem seeded');

    // Step 6: Seed shift and timesheet data
    logger.info('📅 Seeding shift management...');
    await seedShifts();
    await seedTimesheets();
    logger.info('✓ Shift management seeded');

    // Step 7: Seed participant care routines
    logger.info('📋 Seeding participant care...');
    await seedRoutines();
    await seedRoutineCompletions();
    logger.info('✓ Participant care seeded');

    // Step 8: Seed events and registrations
    logger.info('🎪 Seeding community events...');
    await seedEvents();
    await seedEventRegistrations();
    logger.info('✓ Community events seeded');

    // Step 9: Seed worker management data
    logger.info('✅ Seeding worker management...');
    await seedWorkerCompliance();
    await seedUserPresence();
    logger.info('✓ Worker management seeded');

    // Step 10: Seed additional organizations
    logger.info('🏢 Seeding organizations...');
    await seedOrganizations();
    logger.info('✓ Organizations seeded');

    // Step 11: Display summary
    await displaySeedingSummary();

    // Step 11: Disconnect
    await disconnectDB();

    logger.info('🎉 STAGING SEEDING COMPLETED SUCCESSFULLY!');
    process.exit(0);

  } catch (error) {
    logger.error('💥 STAGING SEEDING FAILED:', error);

    // Ensure we disconnect even on error
    await disconnectDB();

    process.exit(1);
  }
};

// Export for external use
export { runStagingSeeding };

// Run if called directly
if (require.main === module) {
  runStagingSeeding();
}