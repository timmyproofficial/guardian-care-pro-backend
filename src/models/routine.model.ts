/**
 * Routine model definition
 * Schema for standardized care routines that can be attached to shifts
 */

import mongoose, { Document, Schema } from 'mongoose';
import { 
  RoutineStatus, 
  RoutineTask 
} from '../types/routine.types';
import { generateRoutineId } from '../utils/generators';

/**
 * Routine document interface
 * Defines the structure of a routine document
 */
export interface IRoutine extends Document {
  _id: mongoose.Types.ObjectId;
  routineId: string;                         // Unique routine identifier
  name: string;                              // Routine name/title
  description?: string;                      // Optional description
  participantId: mongoose.Types.ObjectId;    // Participant who owns the routine
  organizationId: mongoose.Types.ObjectId;   // Organization this routine belongs to
  
  // Routine configuration
  serviceTypeId?: mongoose.Types.ObjectId;   // Optional: link to service type
  status: RoutineStatus;                     // Current status of the routine
  
  // Tasks within the routine
  tasks: RoutineTask[];
  
  // Usage tracking
  timesUsed: number;                         // How many times this routine has been used
  lastUsedAt?: Date;                         // Last time this routine was used
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getActiveTasks(): RoutineTask[];
  incrementUsage(): Promise<IRoutine>;
}

/**
 * Routine task schema definition
 * Schema for individual tasks within a routine
 */
const routineTaskSchema = new Schema<RoutineTask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    _id: true // Enable _id for tasks
  }
);

/**
 * Routine schema definition
 */
const routineSchema = new Schema<IRoutine>(
  {
    routineId: {
      type: String,
      required: true,
      unique: true,
      default: generateRoutineId
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },
    serviceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceType'
    },

    status: {
      type: String,
      enum: Object.values(RoutineStatus),
      default: RoutineStatus.ACTIVE,
      required: true
    },
    tasks: {
      type: [routineTaskSchema],
      validate: {
        validator: function(tasks: RoutineTask[]) {
          return tasks.length > 0 && tasks.length <= 50; // Max 50 tasks per routine
        },
        message: 'A routine must have at least 1 task and no more than 50 tasks'
      }
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUsedAt: {
      type: Date
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
routineSchema.index({ routineId: 1 }, { unique: true });
routineSchema.index({ participantId: 1 });
routineSchema.index({ organizationId: 1 });
routineSchema.index({ status: 1 });
routineSchema.index({ serviceTypeId: 1 });
routineSchema.index({ participantId: 1, status: 1 });
routineSchema.index({ 
  participantId: 1, 
  name: 1 
}, { 
  name: 'idx_participant_name_search' 
});

/**
 * Virtual for task count
 */
routineSchema.virtual('taskCount').get(function() {
  return this.tasks.length;
});





/**
 * Instance method to get active tasks
 */
routineSchema.methods.getActiveTasks = function() {
  return this.tasks;
};

/**
 * Instance method to increment usage
 */
routineSchema.methods.incrementUsage = function() {
  this.timesUsed += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

/**
 * Static method to find routines by participant
 */
routineSchema.statics.findByParticipant = function(participantId: string, status?: RoutineStatus) {
  const query: any = { participantId: new mongoose.Types.ObjectId(participantId) };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query).sort({ name: 1, createdAt: -1 });
};

/**
 * Static method to find routines by service type
 */
routineSchema.statics.findByServiceType = function(serviceTypeId: string, participantId?: string) {
  const query: any = { serviceTypeId: new mongoose.Types.ObjectId(serviceTypeId) };
  
  if (participantId) {
    query.participantId = new mongoose.Types.ObjectId(participantId);
  }
  
  return this.find(query).sort({ timesUsed: -1, name: 1 });
};

/**
 * Create and export the Routine model
 */
const Routine = mongoose.model<IRoutine>('Routine', routineSchema);

export default Routine;
