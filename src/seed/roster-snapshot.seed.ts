/**
 * Comprehensive Roster Snapshot Seeder
 * Seeds extensive roster data for testing with multiple providers
 */

import mongoose from 'mongoose';
import RosterSnapshot from '../models/rosterSnapshot.model';
import ShiftReference from '../models/shiftReference.model';
import WorkerRegistry from '../models/workerRegistry.model';
import ParticipantRegistry from '../models/participantRegistry.model';
import Provider from '../models/provider.model';
import {
  RosterFileType,
  ProcessingStatus,
  ShiftReferenceStatus,
  RegistryStatus
} from '../types/roster.types';
import config from '../config/env';
import logger from '../utils/logger';

// Helper function to create multiple providers
async function createMultipleProviders() {
  const providerData = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@agedcareplus.com.au',
      password: '$2a$10$hashedpassword1', // In real scenario, use proper hashing
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Aged Care Plus',
      abn: '12345678901',
      businessAddress: {
        street: '123 Main Street',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000'
      },
      providerType: 'AGED_CARE',
      primaryContactName: 'John Smith',
      primaryContactPhone: '+61412345678',
      primaryContactEmail: 'john.smith@agedcareplus.com.au'
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@disabilitysupport.com.au',
      password: '$2a$10$hashedpassword2',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Disability Support Services',
      abn: '23456789013',
      businessAddress: {
        street: '456 Oak Avenue',
        city: 'Melbourne',
        state: 'VIC',
        postcode: '3000'
      },
      providerType: 'DISABILITY_SUPPORT',
      primaryContactName: 'Sarah Johnson',
      primaryContactPhone: '+61423456789',
      primaryContactEmail: 'sarah.johnson@disabilitysupport.com.au'
    },
    {
      firstName: 'Mike',
      lastName: 'Wilson',
      email: 'mike.wilson@communitycare.com.au',
      password: '$2a$10$hashedpassword3',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Community Care Solutions',
      abn: '34567890124',
      businessAddress: {
        street: '789 Pine Road',
        city: 'Brisbane',
        state: 'QLD',
        postcode: '4000'
      },
      providerType: 'COMMUNITY_SUPPORT',
      primaryContactName: 'Mike Wilson',
      primaryContactPhone: '+61434567890',
      primaryContactEmail: 'mike.wilson@communitycare.com.au'
    },
    {
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma.davis@seniorliving.com.au',
      password: '$2a$10$hashedpassword4',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Senior Living Support',
      abn: '45678901235',
      businessAddress: {
        street: '321 Elm Street',
        city: 'Perth',
        state: 'WA',
        postcode: '6000'
      },
      providerType: 'AGED_CARE',
      primaryContactName: 'Emma Davis',
      primaryContactPhone: '+61445678901',
      primaryContactEmail: 'emma.davis@seniorliving.com.au'
    },
    {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@inclusioncare.com.au',
      password: '$2a$10$hashedpassword5',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Inclusion Care Services',
      abn: '56789012346',
      businessAddress: {
        street: '654 Birch Lane',
        city: 'Adelaide',
        state: 'SA',
        postcode: '5000'
      },
      providerType: 'DISABILITY_SUPPORT',
      primaryContactName: 'David Brown',
      primaryContactPhone: '+61456789012',
      primaryContactEmail: 'david.brown@inclusioncare.com.au'
    },
    {
      firstName: 'Lisa',
      lastName: 'Garcia',
      email: 'lisa.garcia@wellbeingcare.com.au',
      password: '$2a$10$hashedpassword6',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Wellbeing Care Network',
      abn: '67890123457',
      businessAddress: {
        street: '987 Maple Drive',
        city: 'Canberra',
        state: 'ACT',
        postcode: '2600'
      },
      providerType: 'COMMUNITY_SUPPORT',
      primaryContactName: 'Lisa Garcia',
      primaryContactPhone: '+61467890123',
      primaryContactEmail: 'lisa.garcia@wellbeingcare.com.au'
    },
    {
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert.martinez@compassioncare.com.au',
      password: '$2a$10$hashedpassword7',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Compassion Care Providers',
      abn: '78901234568',
      businessAddress: {
        street: '147 Cedar Court',
        city: 'Darwin',
        state: 'NT',
        postcode: '0800'
      },
      providerType: 'AGED_CARE',
      primaryContactName: 'Robert Martinez',
      primaryContactPhone: '+61478901234',
      primaryContactEmail: 'robert.martinez@compassioncare.com.au'
    },
    {
      firstName: 'Jennifer',
      lastName: 'Lee',
      email: 'jennifer.lee@empowermentcare.com.au',
      password: '$2a$10$hashedpassword8',
      role: 'provider',
      isEmailVerified: true,
      organizationName: 'Empowerment Care Services',
      abn: '89012345679',
      businessAddress: {
        street: '258 Willow Way',
        city: 'Hobart',
        state: 'TAS',
        postcode: '7000'
      },
      providerType: 'DISABILITY_SUPPORT',
      primaryContactName: 'Jennifer Lee',
      primaryContactPhone: '+61489012345',
      primaryContactEmail: 'jennifer.lee@empowermentcare.com.au'
    }
  ];

  const providers = [];
  for (const data of providerData) {
    const provider = await Provider.create(data);
    providers.push(provider);
    logger.info(`Created provider: ${provider.organizationName}`);
  }

  return providers;
}

// Helper function to create extensive roster data for a provider
async function createProviderRosterData(provider: any) {
  console.log(`  Creating roster snapshot for ${provider.organizationName}...`);
  // Create roster snapshot
  const snapshot = await RosterSnapshot.create({
    providerId: provider._id,
    fileName: `${provider.organizationName.toLowerCase().replace(/\s+/g, '-')}-roster-${new Date().toISOString().split('T')[0]}.csv`,
    fileType: RosterFileType.CSV,
    fileSizeBytes: Math.floor(Math.random() * 200000) + 100000,
    fileStoragePath: `uploads/rosters/${provider._id}/${Date.now()}-roster.csv`,
    processingStatus: ProcessingStatus.COMPLETED,
    processingStartedAt: new Date(Date.now() - 3600000), // 1 hour ago
    processingCompletedAt: new Date(),
    totalShiftsDetected: 800,
    shiftsSuccessfullyParsed: 780,
    shiftsFailedParsing: 20,
    newWorkersCreated: 80,
    newParticipantsCreated: 60,
    existingWorkersMatched: 0,
    existingParticipantsMatched: 0,
    rosterPeriodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    rosterPeriodEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
    notes: `Comprehensive roster for ${provider.organizationName}`,
    uploadedBy: provider._id
  });

  console.log(`  Creating 80 workers for ${provider.organizationName}...`);
  // Create 80 workers for this provider
  const workers = await createWorkersForProvider(provider._id, snapshot._id, 80);
  console.log(`  ✓ Created ${workers.length} workers`);

  console.log(`  Creating 60 participants for ${provider.organizationName}...`);
  // Create 60 participants for this provider
  const participants = await createParticipantsForProvider(provider._id, snapshot._id, 60, provider.businessAddress.state);
  console.log(`  ✓ Created ${participants.length} participants`);

  console.log(`  Creating 800 shift references for ${provider.organizationName}...`);
  // Create 800 shift references (mix of past and future)
  await createShiftReferencesForProvider(provider._id, snapshot._id, workers, participants, 800);
  console.log(`  ✓ Created shift references`);

  logger.info(`Completed roster data for ${provider.organizationName}`);
}

// Helper function to create workers
async function createWorkersForProvider(providerId: mongoose.Types.ObjectId, snapshotId: mongoose.Types.ObjectId, numWorkers: number = 80) {
  const baseWorkerNames = [
    'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis',
    'Frank Wilson', 'Grace Taylor', 'Henry Anderson', 'Ivy Thomas', 'Jack Jackson',
    'Kate White', 'Liam Harris', 'Mia Martin', 'Noah Thompson', 'Olivia Garcia',
    'Peter Martinez', 'Quinn Robinson', 'Ryan Clark', 'Sophia Rodriguez', 'Tyler Lewis',
    'Uma Walker', 'Victor Hall', 'Wendy Allen', 'Xavier Young', 'Yara King',
    'Zara Ahmed', 'Ahmed Hassan', 'Maria Silva', 'Carlos Rodriguez', 'Ana Costa',
    'Luis Pereira', 'Sofia Santos', 'Diego Morales', 'Camila Ferreira', 'Mateo Gonzalez',
    'Valentina Ruiz', 'Leonardo Castro', 'Isabella Vargas', 'Santiago Herrera', 'Gabriela Lopez',
    'Miguel Torres', 'Valeria Medina', 'Sebastian Flores', 'Martina Gutierrez', 'Nicolas Rojas',
    'Renata Morales', 'Lucas Silva', 'Amanda Costa', 'Bruno Pereira', 'Carolina Santos',
    'Fernando Morales', 'Juliana Ferreira', 'Rafael Gonzalez', 'Beatriz Ruiz', 'Thiago Castro',
    'Larissa Vargas', 'Enzo Herrera', 'Mariana Lopez', 'Arthur Torres', 'Helena Medina',
    'Davi Flores', 'Luiza Gutierrez', 'Heitor Rojas', 'Laura Morales', 'Theo Silva',
    'Melissa Costa', 'Caio Pereira', 'Natalia Santos', 'Ryan Morales', 'Sophie Ferreira',
    'Ethan Gonzalez', 'Chloe Ruiz', 'Mason Castro', 'Harper Vargas', 'Logan Herrera',
    'Ava Lopez', 'Jackson Torres', 'Isabella Medina', 'Aiden Flores', 'Ella Gutierrez',
    'Grayson Rojas', 'Scarlett Morales', 'Carter Silva', 'Nova Costa', 'Liam Pereira'
  ];

  // Generate worker names - use base names and add variations if needed
  const workerNames = [];
  for (let i = 0; i < numWorkers; i++) {
    if (i < baseWorkerNames.length) {
      workerNames.push(baseWorkerNames[i]);
    } else {
      // Create variations for additional workers
      const baseName = baseWorkerNames[i % baseWorkerNames.length];
      const variation = Math.floor(i / baseWorkerNames.length) + 1;
      workerNames.push(`${baseName} ${variation}`);
    }
  }

  const competencies = [
    ['Personal Care', 'Respite Care'],
    ['Community Support', 'Transport'],
    ['Personal Care', 'Daily Living Support'],
    ['Community Support', 'Respite Care'],
    ['Transport', 'Personal Care'],
    ['Daily Living Support', 'Community Support'],
    ['Personal Care', 'Behavioural Support'],
    ['Respite Care', 'Transport'],
    ['Community Support', 'Daily Living Support'],
    ['Personal Care', 'Transport'],
    ['Behavioural Support', 'Mental Health Support'],
    ['Transport', 'Community Support'],
    ['Daily Living Support', 'Personal Care'],
    ['Respite Care', 'Community Support'],
    ['Personal Care', 'Transport', 'Daily Living Support'],
    ['Community Support', 'Behavioural Support'],
    ['Transport', 'Respite Care'],
    ['Daily Living Support', 'Mental Health Support'],
    ['Personal Care', 'Community Support', 'Behavioural Support'],
    ['Transport', 'Daily Living Support', 'Respite Care']
  ];

  const qualifications = [
    ['First Aid', 'NDIS Worker Screening'],
    ['Driver License', 'First Aid'],
    ['NDIS Worker Screening', 'CPR'],
    ['First Aid', 'Mental Health First Aid'],
    ['Driver License', 'NDIS Worker Screening'],
    ['CPR', 'First Aid'],
    ['Mental Health First Aid', 'First Aid'],
    ['Driver License', 'CPR'],
    ['NDIS Worker Screening', 'Mental Health First Aid'],
    ['First Aid', 'Driver License'],
    ['CPR', 'Mental Health First Aid'],
    ['Driver License', 'First Aid', 'CPR'],
    ['NDIS Worker Screening', 'Mental Health First Aid', 'First Aid'],
    ['First Aid', 'CPR', 'Driver License'],
    ['Mental Health First Aid', 'NDIS Worker Screening'],
    ['Driver License', 'CPR', 'First Aid'],
    ['NDIS Worker Screening', 'First Aid'],
    ['CPR', 'Mental Health First Aid', 'Driver License'],
    ['First Aid', 'NDIS Worker Screening', 'CPR'],
    ['Driver License', 'Mental Health First Aid', 'First Aid']
  ];

  const availabilityOptions = [
    ['Monday 9am to 5pm', 'Wednesday 10am to 4pm', 'Friday 8am to 2pm'],
    ['Tuesday 8am to 4pm', 'Thursday 9am to 3pm', 'Saturday 10am to 2pm'],
    ['Monday 10am to 6pm', 'Tuesday 9am to 5pm', 'Friday 11am to 3pm'],
    ['Wednesday 8am to 2pm', 'Thursday 1pm to 7pm', 'Saturday 9am to 1pm'],
    ['Monday 8am to 12pm', 'Wednesday 2pm to 6pm', 'Friday 9am to 5pm'],
    ['Tuesday 10am to 4pm', 'Thursday 8am to 4pm', 'Sunday 11am to 3pm'],
    ['Monday 9am to 3pm', 'Tuesday 10am to 4pm', 'Thursday 8am to 2pm'],
    ['Wednesday 11am to 5pm', 'Friday 9am to 3pm', 'Saturday 10am to 4pm'],
    ['Monday 8am to 4pm', 'Wednesday 9am to 3pm', 'Friday 10am to 6pm'],
    ['Tuesday 11am to 3pm', 'Thursday 8am to 4pm', 'Saturday 9am to 1pm'],
    ['Monday 10am to 6pm', 'Tuesday 8am to 2pm', 'Thursday 1pm to 7pm'],
    ['Wednesday 9am to 5pm', 'Friday 8am to 4pm', 'Sunday 10am to 2pm'],
    ['Monday 8am to 12pm', 'Tuesday 1pm to 5pm', 'Thursday 9am to 3pm'],
    ['Wednesday 10am to 4pm', 'Friday 11am to 3pm', 'Saturday 8am to 2pm'],
    ['Monday 9am to 5pm', 'Tuesday 10am to 6pm', 'Wednesday 8am to 2pm'],
    ['Thursday 9am to 3pm', 'Friday 8am to 4pm', 'Saturday 11am to 5pm'],
    ['Monday 10am to 2pm', 'Tuesday 8am to 4pm', 'Thursday 1pm to 7pm'],
    ['Wednesday 9am to 5pm', 'Friday 10am to 6pm', 'Sunday 8am to 12pm'],
    ['Monday 8am to 3pm', 'Tuesday 11am to 5pm', 'Thursday 9am to 1pm'],
    ['Wednesday 10am to 6pm', 'Friday 8am to 2pm', 'Saturday 9am to 5pm']
  ];

  const workers = [];
  for (let i = 0; i < workerNames.length; i++) {
    const worker = await WorkerRegistry.create({
      providerId,
      externalWorkerId: `WRK-${providerId.toString().slice(-4)}-${String(i + 1).padStart(3, '0')}`,
      workerName: workerNames[i],
      phone: `+614${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      email: `${workerNames[i].toLowerCase().replace(/\s+/g, '.')}@workers.com`,
      competencies: competencies[i % competencies.length],
      qualifications: qualifications[i % qualifications.length],
      availabilitySchedule: availabilityOptions[i % availabilityOptions.length],
      averageRating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
      status: RegistryStatus.LIGHTWEIGHT,
      totalShiftsAssigned: Math.floor(Math.random() * 50) + 10,
      totalShiftsCancelled: Math.floor(Math.random() * 5),
      lastShiftDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      firstSeenInSnapshot: snapshotId,
      firstSeenDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    });
    workers.push(worker);
  }

  return workers;
}

// Helper function to create participants
async function createParticipantsForProvider(providerId: mongoose.Types.ObjectId, snapshotId: mongoose.Types.ObjectId, numParticipants: number = 60, providerState?: string) {
  const baseParticipantNames = [
    'Margaret Chen', 'Robert Davis', 'Susan Patel', 'James Wilson', 'Linda Thompson',
    'Michael Brown', 'Patricia Garcia', 'Christopher Lee', 'Jennifer Martin', 'Daniel Rodriguez',
    'Barbara Taylor', 'Matthew Anderson', 'Lisa Thomas', 'Anthony Jackson', 'Karen White',
    'Mark Harris', 'Nancy Clark', 'Steven Lewis', 'Betty Walker', 'Paul Hall',
    'Helen Allen', 'George Young', 'Sandra King', 'Kenneth Wright', 'Donna Lopez',
    'Charles Hill', 'Carolyn Scott', 'Ronald Green', 'Sharon Adams', 'Joseph Baker',
    'Emily Mitchell', 'David Parker', 'Jessica Evans', 'Thomas Carter', 'Sarah Roberts',
    'William Phillips', 'Olivia Campbell', 'Richard Edwards', 'Sophia Collins', 'Charles Stewart',
    'Ava Sanchez', 'Joseph Morris', 'Mia Rogers', 'Alexander Peterson', 'Charlotte Reed',
    'Henry Cook', 'Amelia Bailey', 'Benjamin Rivera', 'Harper Cooper', 'Lucas Richardson',
    'Evelyn Cox', 'Mason Howard', 'Abigail Ward', 'Ethan Torres', 'Elizabeth Peterson',
    'Jacob Ramirez', 'Sofia James', 'Logan Brooks', 'Grace Kelly', 'Jackson Sanders',
    'Victoria Price', 'Aiden Bennett', 'Chloe Wood', 'Carter Barnes', 'Zoey Ross'
  ];

  // Generate participant names - use base names and add variations if needed
  const participantNames = [];
  for (let i = 0; i < numParticipants; i++) {
    if (i < baseParticipantNames.length) {
      participantNames.push(baseParticipantNames[i]);
    } else {
      // Create variations for additional participants
      const baseName = baseParticipantNames[i % baseParticipantNames.length];
      const variation = Math.floor(i / baseParticipantNames.length) + 1;
      participantNames.push(`${baseName} ${variation}`);
    }
  }

  const supportNeeds = [
    ['Personal Care', 'Daily Living'],
    ['Community Support', 'Transport'],
    ['Personal Care', 'Respite Care'],
    ['Community Support', 'Daily Living Support'],
    ['Transport', 'Personal Care'],
    ['Daily Living Support', 'Community Support'],
    ['Personal Care', 'Behavioural Support'],
    ['Respite Care', 'Transport'],
    ['Community Support', 'Daily Living Support'],
    ['Personal Care', 'Transport']
  ];

  const locations = [
    'Sydney CBD', 'Bondi Beach', 'Parramatta', 'Newtown', 'Surry Hills',
    'Melbourne CBD', 'St Kilda', 'Richmond', 'Footscray', 'Brunswick',
    'Brisbane CBD', 'South Bank', 'Fortitude Valley', 'West End', 'New Farm',
    'Perth CBD', 'Fremantle', 'Subiaco', 'Joondalup', 'Mandurah',
    'Adelaide CBD', 'North Adelaide', 'Glenelg', 'Modbury', 'Tea Tree Gully',
    'Hobart CBD', 'Sandy Bay', 'New Town', 'Lenah Valley', 'Kingston',
    'Darwin CBD', 'Palmerston', 'Nightcliff', 'Alice Springs', 'Katherine',
    'Cairns', 'Townsville', 'Mackay', 'Rockhampton', 'Toowoomba',
    'Wollongong', 'Newcastle', 'Central Coast', 'Gold Coast', 'Sunshine Coast'
  ];

  const streetNames = [
    'George Street', 'Pitt Street', 'Elizabeth Street', 'Collins Street', 'Flinders Street',
    'Queen Street', 'Adelaide Street', 'Albert Street', 'William Street', 'Mary Street',
    'Smith Street', 'High Street', 'Church Street', 'Victoria Street', 'Oxford Street',
    'King Street', 'Princess Street', 'Stanley Street', 'Campbell Street', 'Liverpool Street'
  ];

  const participants = [];
  for (let i = 0; i < participantNames.length; i++) {
    const participant = await ParticipantRegistry.create({
      providerId,
      externalParticipantId: `PAR-${providerId.toString().slice(-4)}-${String(i + 1).padStart(3, '0')}`,
      participantName: participantNames[i],
      phone: `+614${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      ndisNumber: `123${String(Math.floor(Math.random() * 900000) + 100000)}`,
      address: `${Math.floor(Math.random() * 500) + 1} ${streetNames[i % streetNames.length]}, ${locations[i % locations.length]}, ${providerState || 'NSW'} ${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
      postcode: String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0'),
      supportNeeds: supportNeeds[i % supportNeeds.length],
      preferredLanguages: ['English'],
      preferredGender: Math.random() > 0.5 ? 'Female' : 'Male',
      status: RegistryStatus.LIGHTWEIGHT,
      totalShiftsScheduled: Math.floor(Math.random() * 40) + 5,
      lastShiftDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      firstSeenInSnapshot: snapshotId,
      firstSeenDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000)
    });
    participants.push(participant);
  }

  return participants;
}

// Helper function to create shift references
async function createShiftReferencesForProvider(
  providerId: mongoose.Types.ObjectId,
  snapshotId: mongoose.Types.ObjectId,
  workers: any[],
  participants: any[],
  numShifts: number = 800
) {
  const shiftTypes = ['Personal Care', 'Community Support', 'Respite Care', 'Transport', 'Daily Living Support', 'Behavioural Support', 'Mental Health Support'];
  const supportCategories = ['Core', 'Capacity Building', 'Assistance with Social and Community Participation'];
  const locations = ['Client Home', 'Community Center', 'Day Program', 'Shopping Center', 'Medical Appointment', 'Recreation Center', 'Therapy Clinic'];

  const shifts = [];

  // Create shifts for the past 90 days and next 180 days for better distribution
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < numShifts; i++) {
    const randomWorker = workers[Math.floor(Math.random() * workers.length)];
    const randomParticipant = participants[Math.floor(Math.random() * participants.length)];

    // Random date within range
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

    // Random time between 8am and 8pm
    const hour = Math.floor(Math.random() * 12) + 8; // 8 to 20
    const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45

    const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const endTime = `${String(hour + Math.floor(Math.random() * 4) + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // Determine status based on date
    let status;
    if (randomDate < new Date()) {
      // Past shifts
      const rand = Math.random();
      if (rand < 0.85) {
        status = ShiftReferenceStatus.COMPLETED;
      } else {
        status = ShiftReferenceStatus.CANCELLED;
      }
    } else {
      // Future shifts
      const rand = Math.random();
      if (rand < 0.8) {
        status = ShiftReferenceStatus.SCHEDULED;
      } else if (rand < 0.9) {
        status = ShiftReferenceStatus.CONFIRMED;
      } else {
        status = ShiftReferenceStatus.CANCELLED;
      }
    }

    const shift = await ShiftReference.create({
      providerId,
      snapshotId,
      externalShiftId: `SHIFT-${providerId.toString().slice(-4)}-${String(i + 1).padStart(4, '0')}`,
      shiftDate: randomDate,
      shiftStartTime: startTime,
      shiftEndTime: endTime,
      shiftDurationMinutes: Math.floor(Math.random() * 480) + 60, // 1-8 hours
      assignedWorkerId: randomWorker._id,
      assignedWorkerName: randomWorker.workerName,
      assignedWorkerPhone: randomWorker.phone,
      assignedWorkerEmail: randomWorker.email,
      participantId: randomParticipant._id,
      participantName: randomParticipant.participantName,
      participantPhone: randomParticipant.phone,
      participantNdisNumber: randomParticipant.ndisNumber,
      locationName: locations[Math.floor(Math.random() * locations.length)],
      locationAddress: randomParticipant.address,
      locationPostcode: randomParticipant.postcode,
      shiftType: shiftTypes[Math.floor(Math.random() * shiftTypes.length)],
      supportCategory: supportCategories[Math.floor(Math.random() * supportCategories.length)],
      billingRate: Math.floor(Math.random() * 50) + 30, // $30-80/hour
      requiredCompetencies: randomWorker.competencies.slice(0, Math.floor(Math.random() * randomWorker.competencies.length) + 1),
      currentStatus: status,
      statusUpdatedAt: new Date(),
      parsingConfidenceScore: Math.random() * 0.3 + 0.7 // 0.7-1.0
    });

    shifts.push(shift);
  }

  return shifts;
}

async function seedRosterSnapshots() {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoose.url);
    }
    logger.info('Connected to MongoDB');

    console.log('\n========================================');
    console.log('COMPREHENSIVE ROSTER SEEDING STARTED');
    console.log('========================================\n');

    // Clear ALL existing roster data
    console.log('Clearing existing roster data...');
    await ShiftReference.deleteMany({});
    await WorkerRegistry.deleteMany({});
    await ParticipantRegistry.deleteMany({});
    await RosterSnapshot.deleteMany({});
    await Provider.deleteMany({}); // Also clear providers since they are part of the roster system
    logger.info('Cleared all existing roster data');

    // Create multiple providers
    const providers = await createMultipleProviders();
    console.log(`Created ${providers.length} providers`);

    // For each provider, create extensive roster data
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      console.log(`\n--- Processing provider ${i + 1}/${providers.length}: ${provider.organizationName} ---`);
      await createProviderRosterData(provider);
      console.log(`✓ Completed provider ${i + 1}/${providers.length}: ${provider.organizationName}`);
    }

    console.log('\n========================================');
    console.log('COMPREHENSIVE ROSTER SEEDING COMPLETE');
    console.log('========================================');
    console.log(`Total Providers: ${providers.length}`);
    console.log(`Total Workers: ${providers.length * 80}`); // 80 workers per provider
    console.log(`Total Participants: ${providers.length * 60}`); // 60 participants per provider
    console.log(`Total Shift References: ${providers.length * 800}`); // 800 shifts per provider
    console.log('========================================\n');

    console.log('\nYou can now test the following endpoints:');
    console.log('- GET /api/v1/users/admin/providers');
    console.log('- GET /api/v1/users/admin/providers/phone/:phoneNumber');
    console.log('- GET /api/v1/users/admin/providers/past-shifts/phone/:phoneNumber');
    console.log('- GET /api/v1/roster-snapshots');
    console.log('- GET /api/v1/roster/shift-references/search');
    console.log('========================================\n');

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    logger.error('Error seeding roster snapshots:', error);
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seeder
seedRosterSnapshots();

