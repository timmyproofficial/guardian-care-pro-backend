import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IIncident extends Document {
  shiftId: string;             
  reportedBy: Types.ObjectId;                // User who reported the incident
  reportedAgainst?: Types.ObjectId;          // Optional: Who the incident is against (e.g., a worker)
  title: string;                             // Brief title or summary
  description: string;                       // Detailed description
  severity: 'LOW' | 'MEDIUM' | 'HIGH';       // Severity of the incident
  urlLinks?: string[];                       // Optional reference URLs
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolutionNote?: string;                   // Admin resolution comment
  resolvedBy?: Types.ObjectId;               // Admin who handled the incident
  resolvedAt?: Date;                         // Timestamp when resolved
  createdAt: Date;
  updatedAt: Date;
}



const incidentSchema = new Schema<IIncident>(
  {
   shiftId: {
      type: String, 
      ref: 'Shift',
      required: true,
      validate: {
        validator: async function (value: string) {
          const shift = await mongoose.model('Shift').findOne({ shiftId: value });
          return !!shift;
        },
        message: 'Shift does not exist. Incident cannot be created.'
      }
},
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reportedAgainst: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW'
    },
    urlLinks: {
      type: [String],
      validate: {
        validator: function (arr: string[]) {
          return arr.every(link => /^https?:\/\/\S+$/.test(link));
        },
        message: 'One or more URLs are invalid'
      }
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'],
      default: 'OPEN'
    },
    resolutionNote: {
      type: String
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

incidentSchema.index({shiftId:1});

const Incident = mongoose.model<IIncident>('Incident', incidentSchema);
export default Incident;
