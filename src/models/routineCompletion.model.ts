/**
 * Routine Completion model definition
 * Schema for tracking completion of routines attached to shifts
 */

import mongoose, { Document, Schema } from 'mongoose';
import { 
  RoutineCompletionStatus, 
  TaskCompletionStatus, 
  TaskCompletion 
} from '../types/routine.types';

/**
 * Routine Completion document interface
 * Defines the structure of a routine completion document
 */
export interface IRoutineCompletion extends Document {
  _id: mongoose.Types.ObjectId;
  shiftId: mongoose.Types.ObjectId;           // Reference to the shift
  routineId: mongoose.Types.ObjectId;         // Reference to the routine
  workerId: mongoose.Types.ObjectId;          // Worker who completed it
  participantId: mongoose.Types.ObjectId;     // Participant who owns the routine
  organizationId: mongoose.Types.ObjectId;    // Organization this completion belongs to
  
  // Completion tracking
  status: RoutineCompletionStatus;            // Overall completion status
  startedAt?: Date;                           // When routine was started
  completedAt?: Date;                         // When routine was completed
  totalTimeSpentMinutes?: number;             // Total time spent on routine
  
  // Task-level completion
  taskCompletions: TaskCompletion[];          // Individual task completions
  completionPercentage: number;               // 0-100 percentage completion
  
  // Worker notes and feedback
  overallNotes?: string;                      // General notes about the routine
  issuesEncountered?: string;                 // Any problems or issues
  
  // Quality metrics
  participantSatisfaction?: number;           // 1-5 satisfaction rating (optional)
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task completion schema definition
 * Schema for individual task completion tracking
 */
const taskCompletionSchema = new Schema<TaskCompletion>(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TaskCompletionStatus),
      default: TaskCompletionStatus.NOT_STARTED,
      required: true
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    numericValue: {
      type: Number,
      min: 0
    },
    photoUrls: [{
      type: String,
      trim: true
    }],
    timeSpentMinutes: {
      type: Number,
      min: 0,
      max: 240 // Max 4 hours for a single task
    }
  },
  {
    _id: false // Don't create _id for task completions
  }
);

/**
 * Routine Completion schema definition
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
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date,
      validate: {
        validator: function(this: IRoutineCompletion, value: Date) {
          // If completedAt is set, startedAt must also be set and be earlier
          if (value && this.startedAt) {
            return value >= this.startedAt;
          }
          return true;
        },
        message: 'Completed time must be after started time'
      }
    },
    totalTimeSpentMinutes: {
      type: Number,
      min: 0,
      max: 480 // Max 8 hours total
    },
    taskCompletions: {
      type: [taskCompletionSchema],
      default: []
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
    },
    issuesEncountered: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    participantSatisfaction: {
      type: Number,
      min: 1,
      max: 5
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

/**
 * Virtual for completed task count
 */
routineCompletionSchema.virtual('completedTaskCount').get(function() {
  return this.taskCompletions.filter(tc => tc.status === TaskCompletionStatus.COMPLETED).length;
});

/**
 * Virtual for total task count
 */
routineCompletionSchema.virtual('totalTaskCount').get(function() {
  return this.taskCompletions.length;
});

/**
 * Virtual for duration in minutes
 */
routineCompletionSchema.virtual('durationMinutes').get(function() {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }
  return null;
});

/**
 * Pre-save middleware to calculate completion percentage
 */
routineCompletionSchema.pre('save', function(next) {
  // Calculate completion percentage based on completed tasks
  if (this.taskCompletions && this.taskCompletions.length > 0) {
    const completedTasks = this.taskCompletions.filter(tc => tc.status === TaskCompletionStatus.COMPLETED);
    this.completionPercentage = Math.round((completedTasks.length / this.taskCompletions.length) * 100);
  } else {
    this.completionPercentage = 0;
  }
  
  // Auto-update status based on completion percentage
  if (this.completionPercentage === 100) {
    this.status = RoutineCompletionStatus.COMPLETED;
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else if (this.completionPercentage > 0) {
    if (this.status === RoutineCompletionStatus.NOT_STARTED) {
      this.status = RoutineCompletionStatus.IN_PROGRESS;
      if (!this.startedAt) {
        this.startedAt = new Date();
      }
    } else if (this.status !== RoutineCompletionStatus.SKIPPED) {
      this.status = this.completionPercentage > 50 ? 
        RoutineCompletionStatus.PARTIALLY_COMPLETED : 
        RoutineCompletionStatus.IN_PROGRESS;
    }
  }
  
  // Calculate total time spent if not manually set
  if (!this.totalTimeSpentMinutes && this.taskCompletions.length > 0) {
    const totalTaskTime = this.taskCompletions.reduce((total, tc) => {
      return total + (tc.timeSpentMinutes || 0);
    }, 0);
    
    if (totalTaskTime > 0) {
      this.totalTimeSpentMinutes = totalTaskTime;
    }
  }
  
  next();
});

/**
 * Instance method to mark task as completed
 */
routineCompletionSchema.methods.completeTask = function(taskId: string, completionData: Partial<TaskCompletion>) {
  const taskCompletion = this.taskCompletions.find((tc: TaskCompletion) => 
    tc.taskId.toString() === taskId
  );
  
  if (taskCompletion) {
    taskCompletion.status = TaskCompletionStatus.COMPLETED;
    taskCompletion.completedAt = new Date();
    Object.assign(taskCompletion, completionData);
  }
  
  return this.save();
};

/**
 * Instance method to skip task
 */
routineCompletionSchema.methods.skipTask = function(taskId: string, reason?: string) {
  const taskCompletion = this.taskCompletions.find((tc: TaskCompletion) => 
    tc.taskId.toString() === taskId
  );
  
  if (taskCompletion) {
    taskCompletion.status = TaskCompletionStatus.SKIPPED;
    if (reason) {
      taskCompletion.notes = reason;
    }
  }
  
  return this.save();
};

/**
 * Instance method to start routine
 */
routineCompletionSchema.methods.startRoutine = function() {
  this.status = RoutineCompletionStatus.IN_PROGRESS;
  this.startedAt = new Date();
  return this.save();
};

/**
 * Instance method to complete routine
 */
routineCompletionSchema.methods.completeRoutine = function(finalData?: Partial<IRoutineCompletion>) {
  this.status = RoutineCompletionStatus.COMPLETED;
  this.completedAt = new Date();
  
  if (finalData) {
    Object.assign(this, finalData);
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
 * Create and export the RoutineCompletion model
 */
const RoutineCompletion = mongoose.model<IRoutineCompletion>('RoutineCompletion', routineCompletionSchema);

export default RoutineCompletion;
