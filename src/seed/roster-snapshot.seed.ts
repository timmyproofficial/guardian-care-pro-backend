/**
 * Roster Snapshot Seeder
 * Seeds sample roster snapshots for testing
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
  ShiftReferenceStatus 
} from '../types/roster.types';
import config from '../config/env';
import logger from '../utils/logger';

async function seedRosterSnapshots() {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoose.url);
    }
    logger.info('Connected to MongoDB');

    // Find a provider (or create one for testing)
    const provider = await Provider.findOne({ role: 'provider' });
    
    if (!provider) {
      logger.error('No provider found. Please register a provider first.');
      console.log('\n========================================');
      console.log('ERROR: No provider found in the database');
      console.log('Please register a provider first using:');
      console.log('POST /api/v1/v1/auth/register with role: "provider"');
      console.log('========================================\n');
      process.exit(1);
    }

    const providerId = provider._id;
    logger.info(`Using provider: ${provider.organizationName} (${providerId})`);

    // Check if we already have seeded data for this provider
    const existingSnapshot = await RosterSnapshot.findOne({ providerId });
    if (existingSnapshot) {
      console.log('\n========================================');
      console.log('WARNING: Roster snapshots already exist for this provider');
      console.log('Clearing existing seed data...');
      console.log('========================================\n');
      
      // Clear existing seed data
      await ShiftReference.deleteMany({ providerId });
      await WorkerRegistry.deleteMany({ providerId });
      await ParticipantRegistry.deleteMany({ providerId });
      await RosterSnapshot.deleteMany({ providerId });
      logger.info('Cleared existing roster data for provider');
    }

    // Create sample roster snapshot
    const snapshot = await RosterSnapshot.create({
      providerId,
      fileName: 'sample-roster-january-2025.csv',
      fileType: RosterFileType.CSV,
      fileSizeBytes: 1024,
      fileStoragePath: 'uploads/rosters/sample-roster-january-2025.csv',
      processingStatus: ProcessingStatus.COMPLETED,
      processingStartedAt: new Date(),
      processingCompletedAt: new Date(),
      totalShiftsDetected: 5,
      shiftsSuccessfullyParsed: 5,
      shiftsFailedParsing: 0,
      newWorkersCreated: 3,
      newParticipantsCreated: 4,
      existingWorkersMatched: 0,
      existingParticipantsMatched: 0,
      rosterPeriodStart: new Date('2025-01-15'),
      rosterPeriodEnd: new Date('2025-01-31'),
      notes: 'Sample roster for January 2025 testing',
      uploadedBy: providerId
    });

    logger.info(`Created roster snapshot: ${snapshot._id}`);

    // Create sample workers in registry
    const workers = await WorkerRegistry.insertMany([
      {
        providerId,
        externalWorkerId: 'WRK-001',
        workerName: 'John Smith',
        phone: '+61412345678',
        email: 'john.smith@email.com',
        competencies: ['Personal Care', 'Respite Care'],
        qualifications: ['First Aid', 'NDIS Worker Screening'],
        totalShiftsAssigned: 0,
        totalShiftsCancelled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      },
      {
        providerId,
        externalWorkerId: 'WRK-002',
        workerName: 'Jane Doe',
        phone: '+61423456789',
        email: 'jane.doe@email.com',
        competencies: ['Community Support', 'Transport'],
        qualifications: ['First Aid', 'Driver License'],
        totalShiftsAssigned: 0,
        totalShiftsCancelled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      },
      {
        providerId,
        externalWorkerId: 'WRK-003',
        workerName: 'Mike Johnson',
        phone: '+61434567890',
        email: 'mike.j@email.com',
        competencies: ['Personal Care'],
        qualifications: ['First Aid'],
        totalShiftsAssigned: 0,
        totalShiftsCancelled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      }
    ]);

    logger.info(`Created ${workers.length} workers in registry`);

    // Create sample participants in registry
    const participants = await ParticipantRegistry.insertMany([
      {
        providerId,
        externalParticipantId: 'PAR-001',
        participantName: 'Mary Johnson',
        phone: '+61498765432',
        address: '123 Main St Sydney NSW 2000',
        postcode: '2000',
        supportNeeds: ['Personal Care', 'Daily Living'],
        preferredLanguages: ['English'],
        totalShiftsScheduled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      },
      {
        providerId,
        externalParticipantId: 'PAR-002',
        participantName: 'Robert Brown',
        phone: '+61487654321',
        address: '456 Oak Ave Melbourne VIC 3000',
        postcode: '3000',
        supportNeeds: ['Community Support'],
        preferredLanguages: ['English'],
        totalShiftsScheduled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      },
      {
        providerId,
        externalParticipantId: 'PAR-003',
        participantName: 'Sarah Wilson',
        phone: '+61476543210',
        address: '789 Pine Rd Brisbane QLD 4000',
        postcode: '4000',
        supportNeeds: ['Respite Care'],
        preferredLanguages: ['English'],
        totalShiftsScheduled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      },
      {
        providerId,
        externalParticipantId: 'PAR-004',
        participantName: 'Tom Davis',
        phone: '+61465432109',
        address: '321 Elm St Perth WA 6000',
        postcode: '6000',
        supportNeeds: ['Transport'],
        preferredLanguages: ['English'],
        totalShiftsScheduled: 0,
        firstSeenInSnapshot: snapshot._id,
        firstSeenDate: new Date()
      }
    ]);

    logger.info(`Created ${participants.length} participants in registry`);

    // Create sample shift references
    const shiftReferences = await ShiftReference.insertMany([
      {
        providerId,
        snapshotId: snapshot._id,
        externalShiftId: 'SHIFT-001',
        shiftDate: new Date('2025-01-15'),
        shiftStartTime: '08:00',
        shiftEndTime: '12:00',
        shiftDurationMinutes: 240,
        serviceType: 'Personal Care',
        address: '123 Main St Sydney NSW 2000',
        workerType: 'external',
        externalWorkerId: workers[0]._id,
        assignedWorkerName: 'John Smith',
        assignedWorkerPhone: '+61412345678',
        participantType: 'external',
        externalParticipantId: participants[0]._id,
        participantName: 'Mary Johnson',
        currentStatus: ShiftReferenceStatus.SCHEDULED,
        originalData: { row: 1, source: 'csv' }
      },
      {
        providerId,
        snapshotId: snapshot._id,
        externalShiftId: 'SHIFT-002',
        shiftDate: new Date('2025-01-15'),
        shiftStartTime: '13:00',
        shiftEndTime: '17:00',
        shiftDurationMinutes: 240,
        serviceType: 'Community Support',
        address: '456 Oak Ave Melbourne VIC 3000',
        workerType: 'external',
        externalWorkerId: workers[1]._id,
        assignedWorkerName: 'Jane Doe',
        assignedWorkerPhone: '+61423456789',
        participantType: 'external',
        externalParticipantId: participants[1]._id,
        participantName: 'Robert Brown',
        currentStatus: ShiftReferenceStatus.SCHEDULED,
        originalData: { row: 2, source: 'csv' }
      },
      {
        providerId,
        snapshotId: snapshot._id,
        externalShiftId: 'SHIFT-003',
        shiftDate: new Date('2025-01-16'),
        shiftStartTime: '09:00',
        shiftEndTime: '15:00',
        shiftDurationMinutes: 360,
        serviceType: 'Respite Care',
        address: '789 Pine Rd Brisbane QLD 4000',
        workerType: 'external',
        externalWorkerId: workers[0]._id,
        assignedWorkerName: 'John Smith',
        assignedWorkerPhone: '+61412345678',
        participantType: 'external',
        externalParticipantId: participants[2]._id,
        participantName: 'Sarah Wilson',
        currentStatus: ShiftReferenceStatus.SCHEDULED,
        originalData: { row: 3, source: 'csv' }
      },
      {
        providerId,
        snapshotId: snapshot._id,
        externalShiftId: 'SHIFT-004',
        shiftDate: new Date('2025-01-16'),
        shiftStartTime: '08:00',
        shiftEndTime: '12:00',
        shiftDurationMinutes: 240,
        serviceType: 'Personal Care',
        address: '123 Main St Sydney NSW 2000',
        workerType: 'external',
        externalWorkerId: workers[2]._id,
        assignedWorkerName: 'Mike Johnson',
        assignedWorkerPhone: '+61434567890',
        participantType: 'external',
        externalParticipantId: participants[0]._id,
        participantName: 'Mary Johnson',
        currentStatus: ShiftReferenceStatus.SCHEDULED,
        originalData: { row: 4, source: 'csv' }
      },
      {
        providerId,
        snapshotId: snapshot._id,
        externalShiftId: 'SHIFT-005',
        shiftDate: new Date('2025-01-17'),
        shiftStartTime: '10:00',
        shiftEndTime: '14:00',
        shiftDurationMinutes: 240,
        serviceType: 'Transport',
        address: '321 Elm St Perth WA 6000',
        workerType: 'external',
        externalWorkerId: workers[1]._id,
        assignedWorkerName: 'Jane Doe',
        assignedWorkerPhone: '+61423456789',
        participantType: 'external',
        externalParticipantId: participants[3]._id,
        participantName: 'Tom Davis',
        currentStatus: ShiftReferenceStatus.SCHEDULED,
        originalData: { row: 5, source: 'csv' }
      }
    ]);

    logger.info(`Created ${shiftReferences.length} shift references`);

    // Summary
    console.log('\n========================================');
    console.log('ROSTER SNAPSHOT SEEDING COMPLETE');
    console.log('========================================');
    console.log(`Provider: ${provider.organizationName}`);
    console.log(`Snapshot ID: ${snapshot._id}`);
    console.log(`Workers Created: ${workers.length}`);
    console.log(`Participants Created: ${participants.length}`);
    console.log(`Shift References Created: ${shiftReferences.length}`);
    console.log('========================================');
    console.log('\nYou can now test the following endpoints:');
    console.log('- GET /api/v1/v1/roster/snapshots');
    console.log(`- GET /api/v1/v1/roster/snapshots/${snapshot._id}`);
    console.log('- GET /api/v1/v1/roster/shift-references');
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

