/**
 * Routine Completion model definition
 * Schema for tracking completion of routines attached to shifts
 */

import mongoose, { Document, Schema } from 'mongoose';
import { 
  RoutineCompletionStatus
} from '../types/routine.types';

/**
 * Routine Completion document interface (Simplified)
 * Defines the structure of a routine completion document
 */
export interface IRoutineCompletion extends Document {
  _id: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;           // Reference to the shift
  routineId: mongoose.Types.ObjectId;         // Reference to the routine
  workerId: mongoose.Types.ObjectId;          // Worker who completed it
  participantId: mongoose.Types.ObjectId;     // Participant who owns the routine
  organizationId: mongoose.Types.ObjectId;    // Organization this completion belongs to
  
  // Completion tracking (simplified)
  status: RoutineCompletionStatus;            // Overall completion status (NOT_STARTED or COMPLETED)
  completedAt?: Date;                         // When routine was completed
  completionPercentage: number;               // 0 or 100 (simple binary completion)
  
  // Worker notes
  overallNotes?: string;                      // General notes about the routine
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}



/**
 * Routine Completion schema definition (Simplified)
 */
const routineCompletionSchema = new Schema<IRoutineCompletion>(
  {
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    routineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Routine',
      required: true
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    status: {
      type: String,
      enum: Object.values(RoutineCompletionStatus),
      default: RoutineCompletionStatus.NOT_STARTED,
      required: true
    },
    completedAt: {
      type: Date
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt fields
  }
);

/**
 * Add indexes for faster queries
 */
routineCompletionSchema.index({ shiftId: 1 }, { unique: true });
routineCompletionSchema.index({ routineId: 1 });
routineCompletionSchema.index({ workerId: 1 });
routineCompletionSchema.index({ participantId: 1 });
routineCompletionSchema.index({ organizationId: 1 });
routineCompletionSchema.index({ status: 1 });
routineCompletionSchema.index({ completedAt: -1 });
routineCompletionSchema.index({ 
  participantId: 1, 
  status: 1, 
  completedAt: -1 
}, { 
  name: 'idx_participant_status_completed' 
});
routineCompletionSchema.index({ 
  workerId: 1, 
  status: 1, 
  completedAt: -1 
}, { 
  name: 'idx_worker_status_completed' 
});
routineCompletionSchema.index({ 
  routineId: 1, 
  status: 1 
}, { 
  name: 'idx_routine_status' 
});

// Index for daily routine completion tracking
routineCompletionSchema.index({ 
  participantId: 1, 
  completedAt: 1 
}, { 
  name: 'idx_participant_daily_completion' 
});

// Index for daily routine assignment tracking
routineCompletionSchema.index({ 
  participantId: 1, 
  createdAt: 1 
}, { 
  name: 'idx_participant_daily_assignment' 
});



/**
 * Pre-save middleware (simplified)
 */
routineCompletionSchema.pre('save', function(next) {
  // Set completion percentage based on status
  if (this.status === RoutineCompletionStatus.COMPLETED) {
    this.completionPercentage = 100;
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else {
    this.completionPercentage = 0;
  }
  
  next();
});

/**
 * Instance method to complete routine (simplified)
 */
routineCompletionSchema.methods.completeRoutine = function(overallNotes?: string) {
  this.status = RoutineCompletionStatus.COMPLETED;
  this.completedAt = new Date();
  this.completionPercentage = 100;
  
  if (overallNotes) {
    this.overallNotes = overallNotes;
  }
  
  return this.save();
};

/**
 * Static method to find by shift
 */
routineCompletionSchema.statics.findByShift = function(shiftId: string) {
  return this.findOne({ shiftId: new mongoose.Types.ObjectId(shiftId) });
};

/**
 * Static method to find completions by participant
 */
routineCompletionSchema.statics.findByParticipant = function(
  participantId: string, 
  status?: RoutineCompletionStatus, 
  limit?: number
) {
  const query: any = { participantId: new mongoose.Types.ObjectId(participantId) };
  
  if (status) {
    query.status = status;
  }
  
  let queryBuilder = this.find(query).sort({ completedAt: -1, createdAt: -1 });
  
  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }
  
  return queryBuilder;
};

/**
 * Static method to find completions by worker
 */
routineCompletionSchema.statics.findByWorker = function(
  workerId: string, 
  status?: RoutineCompletionStatus,
  dateRange?: { startDate: Date; endDate: Date }
) {
  const query: any = { workerId: new mongoose.Types.ObjectId(workerId) };
  
  if (status) {
    query.status = status;
  }
  
  if (dateRange) {
    query.completedAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    };
  }
  
  return this.find(query).sort({ completedAt: -1, createdAt: -1 });
};

/**
 * Static method to get daily completion statistics for a participant (simplified)
 */
routineCompletionSchema.statics.getDailyCompletionStats = function(
  participantId: string,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.aggregate([
    {
      $match: {
        participantId: new mongoose.Types.ObjectId(participantId),
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalAssigned: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', RoutineCompletionStatus.COMPLETED] }, 1, 0]
          }
        },
        notStarted: {
          $sum: {
            $cond: [{ $eq: ['$status', RoutineCompletionStatus.NOT_STARTED] }, 1, 0]
          }
        }
      }
    }
  ]);
};

/**
 * Static method to get detailed daily routine completions
 */
routineCompletionSchema.statics.getDailyRoutineCompletions = function(
  participantId: string,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    participantId: new mongoose.Types.ObjectId(participantId),
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  })
  .populate('routineId', 'routineId name description')
  .populate('shiftId', 'shiftId startTime endTime')
  .populate('workerId', 'firstName lastName')
  .sort({ createdAt: 1 });
};

/**
 * Create and export the RoutineCompletion model
 */
const RoutineCompletion = mongoose.model<IRoutineCompletion>('RoutineCompletion', routineCompletionSchema);

export default RoutineCompletion;
