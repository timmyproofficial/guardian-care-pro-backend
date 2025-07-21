/**
 * Worker search service
 * Handles optimized search and filtering for support workers
 */

import mongoose from 'mongoose';
import Worker from '../models/worker.model';
import Organization from '../models/organization.model';
// import User from '../models/user.model';
import logger from '../utils/logger';

// Interface for worker search filters
export interface WorkerSearchFilters {
  skills?: string[]; // ServiceType ObjectId strings
  serviceAreas?: string[];
  languages?: string[];
  availability?: {
    days?: string[];
    startTime?: string;
    endTime?: string;
    date?: Date;
  };
  minRating?: number;
  maxHourlyRate?: number;
  onlyVerified?: boolean;
  keyword?: string;
}

// Interface for paginated worker results
export interface PaginatedWorkerResult {
  workers: WorkerSummary[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
}

// Interface for optimized worker summary
export interface WorkerSummary {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  skills: { _id: mongoose.Types.ObjectId; name: string; code: string; }[];
  hourlyRate: {
    baseRate: number;
  };
  ratings: {
    average: number;
    count: number;
  };
  serviceAreas: string[];
  languages: string[];
  bio?: string;
  verificationStatus: {
    profileSetupComplete: boolean;
    identityVerified: boolean;
    policeCheckVerified: boolean;
    ndisWorkerScreeningVerified: boolean;
  };
  isInUserOrganization: boolean;
}

/**
 * Search for workers with filters and pagination
 */
export const searchWorkers = async (
  participantId: string,
  filters: WorkerSearchFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<PaginatedWorkerResult> => {
  try {
    // Build query filters
    const query: any = {
      'role': 'supportWorker',
      'status': 'active',
      'verificationStatus.onboardingComplete': true
    };

    // Apply filters
    if (filters.skills && filters.skills.length > 0) {
      // Convert string ObjectIds to actual ObjectIds
      const skillObjectIds = filters.skills.map(skillId => new mongoose.Types.ObjectId(skillId));
      query.skills = { $in: skillObjectIds };
    }

    if (filters.serviceAreas && filters.serviceAreas.length > 0) {
      query.serviceAreas = { $in: filters.serviceAreas };
    }

    if (filters.languages && filters.languages.length > 0) {
      query.languages = { $in: filters.languages };
    }

    if (filters.minRating !== undefined) {
      query['ratings.average'] = { $gte: filters.minRating };
    }

    if (filters.maxHourlyRate !== undefined) {
      query['hourlyRate.baseRate'] = { $lte: filters.maxHourlyRate };
    }

    if (filters.onlyVerified) {
      query['verificationStatus.identityVerified'] = true;
      query['verificationStatus.policeCheckVerified'] = true;
      query['verificationStatus.ndisWorkerScreeningVerified'] = true;
    }

    // Availability filtering
    if (filters.availability) {
      // Filter by days of the week
      if (filters.availability.days && filters.availability.days.length > 0) {
        query['availability.weekdays'] = {
          $elemMatch: {
            day: { $in: filters.availability.days },
            available: true
          }
        };
      }

      // Filter by specific date
      if (filters.availability.date) {
        const date = new Date(filters.availability.date);
        query['availability.unavailableDates'] = { $ne: date };
      }

      // Filter by time slot
      if (filters.availability.startTime && filters.availability.endTime) {
        query['availability.weekdays.slots'] = {
          $elemMatch: {
            start: { $lte: filters.availability.startTime },
            end: { $gte: filters.availability.endTime }
          }
        };
      }
    }

    // Keyword search in name and bio (removed skills since they're ObjectIds now)
    if (filters.keyword) {
      const keywordRegex = new RegExp(filters.keyword, 'i');
      query.$or = [
        { firstName: keywordRegex },
        { lastName: keywordRegex },
        { bio: keywordRegex }
      ];
    }

    // Get organizations for the participant
    const organizations = await Organization.find({ participantId: new mongoose.Types.ObjectId(participantId) });
    
    // Extract worker IDs already in participant's organizations
    const organizationWorkerIds = organizations.reduce((workerIds: mongoose.Types.ObjectId[], org) => {
      const orgWorkerIds = org.workers.map(worker => worker.workerId);
      return [...workerIds, ...orgWorkerIds];
    }, []);

    // Exclude workers already in the participant's organization
    if (organizationWorkerIds.length > 0) {
      query._id = { $nin: organizationWorkerIds };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute count query for total results (using lean for performance)
    const totalResults = await Worker.countDocuments(query).lean();
    const totalPages = Math.ceil(totalResults / limit);

    // Execute main query with pagination
    // Use projection to only return essential fields
    const workers = await Worker.find(query)
      .select({
        firstName: 1,
        lastName: 1,
        profileImage: 1,
        skills: 1,
        'hourlyRate.baseRate': 1,
        ratings: 1,
        serviceAreas: 1,
        languages: 1,
        bio: 1,
        'verificationStatus.profileSetupComplete': 1,
        'verificationStatus.identityVerified': 1,
        'verificationStatus.policeCheckVerified': 1,
        'verificationStatus.ndisWorkerScreeningVerified': 1
      })
      .populate('skills', 'name code')
      .sort({ 'ratings.average': -1, 'hourlyRate.baseRate': 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform results to include isInUserOrganization
    const workerSummaries: WorkerSummary[] = workers.map(worker => ({
        _id: worker._id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        profileImage: typeof worker.profileImage === 'string' ? worker.profileImage : undefined,
        skills: (worker.skills as any[] ?? []).map((skill: any) => ({
            _id: skill._id,
            name: skill.name,
            code: skill.code
        })),
        hourlyRate: {
            baseRate: worker.hourlyRate?.baseRate ?? 0
        },
        ratings: {
            average: worker.ratings?.average ?? 0,
            count: worker.ratings?.count ?? 0
        },
        serviceAreas: worker.serviceAreas ?? [],
        languages: worker.languages ?? [],
        bio: worker.bio,
        verificationStatus: {
            profileSetupComplete: worker.verificationStatus?.profileSetupComplete ?? false,
            identityVerified: worker.verificationStatus?.identityVerified ?? false,
            policeCheckVerified: worker.verificationStatus?.policeCheckVerified ?? false,
            ndisWorkerScreeningVerified: worker.verificationStatus?.ndisWorkerScreeningVerified ?? false
        },
        isInUserOrganization: organizationWorkerIds.some(id =>
            id.toString() === worker._id.toString()
        )
    }));


    return {
      workers: workerSummaries,
      page,
      limit,
      totalPages,
      totalResults,
      hasMore: page < totalPages
    };
  } catch (error) {
    logger.error('Error searching workers:', error);
    throw error;
  }
};

/**
 * Get worker profile detail
 */
export const getWorkerDetail = async (
  workerId: string,
  participantId: string
): Promise<any> => {
  try {
    // Get worker with detailed information
    const worker = await Worker.findById(workerId)
      .select({
        password: 0,
        emailVerificationToken: 0,
        emailVerificationExpires: 0,
        passwordResetToken: 0,
        passwordResetExpires: 0
      })
      .populate('skills', 'name code')
      .populate('shiftRates.rateTimeBandId', 'name code startTime endTime')
      .lean();

    if (!worker) {
      return null;
    }

    // Check if worker is in participant's organization
    const isInUserOrganization = await Organization.exists({
      participantId: new mongoose.Types.ObjectId(participantId),
      'workers.workerId': new mongoose.Types.ObjectId(workerId)
    });

    return {
      ...worker,
      isInUserOrganization: !!isInUserOrganization
    };
  } catch (error) {
    logger.error(`Error getting worker detail for ${workerId}:`, error);
    throw error;
  }
};

/**
 * Get available skills, languages, and service areas for filtering
 */
export const getWorkerFilterOptions = async (): Promise<any> => {
  try {
    // Use aggregation to get unique values efficiently
    const [serviceTypes, languages, serviceAreas] = await Promise.all([
      // Get all active ServiceTypes for skills
      mongoose.model('ServiceType').find({ status: 'active' }).select('_id name').lean(),
      Worker.distinct('languages').lean(),
      Worker.distinct('serviceAreas').lean()
    ]);

    // Get min and max hourly rates
    const rateStats = await Worker.aggregate([
      {
        $group: {
          _id: null,
          minRate: { $min: '$hourlyRate.baseRate' },
          maxRate: { $max: '$hourlyRate.baseRate' }
        }
      }
    ]);

    const hourlyRateRange = rateStats.length > 0 
      ? { min: rateStats[0].minRate, max: rateStats[0].maxRate }
      : { min: 0, max: 100 };

    return {
      skills: serviceTypes.map((st: any) => ({ _id: st._id, name: st.name })),
      languages,
      serviceAreas,
      hourlyRateRange,
      availabilityDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    };
  } catch (error) {
    logger.error('Error getting worker filter options:', error);
    throw error;
  }
};