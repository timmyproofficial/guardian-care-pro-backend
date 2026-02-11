// Test script to validate imports
import mongoose from 'mongoose';
import User from '../models/user.model';
import Job from '../models/job.model';
import Shift from '../models/shift.model';
import { UserRole } from '../types/user.types';
import { JobStatus } from '../types/job.types';

console.log('All imports successful!');
console.log('UserRole.ADMIN:', UserRole.ADMIN);
console.log('JobStatus.ACTIVE:', JobStatus.ACTIVE);