/**
 * Location Seed Data
 * Seeds Australian states, regions, suburbs, and service areas
 */

import mongoose from 'mongoose';
import State from '../models/location/state.model';
import Region from '../models/location/region.model';
import Suburb from '../models/location/suburb.model';
import ServiceArea from '../models/location/serviceArea.model';
import logger from '../utils/logger';

/**
 * Australian States and Territories
 */
const australianStates = [
  { name: 'New South Wales', code: 'NSW', country: 'Australia' },
  { name: 'Victoria', code: 'VIC', country: 'Australia' },
  { name: 'Queensland', code: 'QLD', country: 'Australia' },
  { name: 'Western Australia', code: 'WA', country: 'Australia' },
  { name: 'South Australia', code: 'SA', country: 'Australia' },
  { name: 'Tasmania', code: 'TAS', country: 'Australia' },
  { name: 'Australian Capital Territory', code: 'ACT', country: 'Australia' },
  { name: 'Northern Territory', code: 'NT', country: 'Australia' }
];

/**
 * Major Regions by State
 */
const australianRegions = [
  // NSW Regions
  { name: 'Greater Sydney', code: 'GSYD', stateCode: 'NSW', description: 'Sydney metropolitan area' },
  { name: 'Hunter Region', code: 'HUNT', stateCode: 'NSW', description: 'Newcastle and Hunter Valley' },
  { name: 'Illawarra', code: 'ILLA', stateCode: 'NSW', description: 'Wollongong and surrounds' },
  { name: 'Central Coast', code: 'CCST', stateCode: 'NSW', description: 'Central Coast region' },
  { name: 'Northern Rivers', code: 'NRIV', stateCode: 'NSW', description: 'Far north coast' },
  
  // VIC Regions
  { name: 'Greater Melbourne', code: 'GMEL', stateCode: 'VIC', description: 'Melbourne metropolitan area' },
  { name: 'Geelong', code: 'GEEL', stateCode: 'VIC', description: 'Geelong and Bellarine Peninsula' },
  { name: 'Ballarat', code: 'BALL', stateCode: 'VIC', description: 'Ballarat region' },
  { name: 'Bendigo', code: 'BEND', stateCode: 'VIC', description: 'Bendigo region' },
  { name: 'Gippsland', code: 'GIPP', stateCode: 'VIC', description: 'Gippsland region' },
  
  // QLD Regions
  { name: 'Greater Brisbane', code: 'GBRI', stateCode: 'QLD', description: 'Brisbane metropolitan area' },
  { name: 'Gold Coast', code: 'GOLD', stateCode: 'QLD', description: 'Gold Coast region' },
  { name: 'Sunshine Coast', code: 'SUNS', stateCode: 'QLD', description: 'Sunshine Coast region' },
  { name: 'Cairns', code: 'CAIR', stateCode: 'QLD', description: 'Cairns and Far North Queensland' },
  { name: 'Townsville', code: 'TOWN', stateCode: 'QLD', description: 'Townsville region' },
  
  // WA Regions
  { name: 'Greater Perth', code: 'GPER', stateCode: 'WA', description: 'Perth metropolitan area' },
  { name: 'South West', code: 'SWWA', stateCode: 'WA', description: 'South West region' },
  { name: 'Pilbara', code: 'PILB', stateCode: 'WA', description: 'Pilbara region' },
  
  // SA Regions
  { name: 'Greater Adelaide', code: 'GADE', stateCode: 'SA', description: 'Adelaide metropolitan area' },
  { name: 'Barossa Valley', code: 'BARO', stateCode: 'SA', description: 'Barossa Valley region' },
  
  // TAS Regions
  { name: 'Greater Hobart', code: 'GHOB', stateCode: 'TAS', description: 'Hobart metropolitan area' },
  { name: 'Launceston', code: 'LAUN', stateCode: 'TAS', description: 'Launceston region' },
  
  // ACT
  { name: 'Canberra', code: 'CANB', stateCode: 'ACT', description: 'Australian Capital Territory' },
  
  // NT Regions
  { name: 'Greater Darwin', code: 'GDAR', stateCode: 'NT', description: 'Darwin metropolitan area' },
  { name: 'Alice Springs', code: 'ALIC', stateCode: 'NT', description: 'Alice Springs region' }
];

/**
 * Sample Suburbs (Major ones for each region)
 */
const sampleSuburbs = [
  // Sydney Suburbs
  { name: 'Sydney CBD', postcode: '2000', regionCode: 'GSYD', stateCode: 'NSW', coordinates: [151.2093, -33.8688] },
  { name: 'Parramatta', postcode: '2150', regionCode: 'GSYD', stateCode: 'NSW', coordinates: [151.0042, -33.8151] },
  { name: 'Bondi', postcode: '2026', regionCode: 'GSYD', stateCode: 'NSW', coordinates: [151.2636, -33.8908] },
  { name: 'Penrith', postcode: '2750', regionCode: 'GSYD', stateCode: 'NSW', coordinates: [150.6942, -33.7507] },
  
  // Melbourne Suburbs
  { name: 'Melbourne CBD', postcode: '3000', regionCode: 'GMEL', stateCode: 'VIC', coordinates: [144.9631, -37.8136] },
  { name: 'Carlton', postcode: '3053', regionCode: 'GMEL', stateCode: 'VIC', coordinates: [144.9680, -37.7987] },
  { name: 'St Kilda', postcode: '3182', regionCode: 'GMEL', stateCode: 'VIC', coordinates: [144.9811, -37.8676] },
  { name: 'Frankston', postcode: '3199', regionCode: 'GMEL', stateCode: 'VIC', coordinates: [145.1213, -38.1423] },
  
  // Brisbane Suburbs
  { name: 'Brisbane CBD', postcode: '4000', regionCode: 'GBRI', stateCode: 'QLD', coordinates: [153.0251, -27.4698] },
  { name: 'South Brisbane', postcode: '4101', regionCode: 'GBRI', stateCode: 'QLD', coordinates: [153.0180, -27.4748] },
  { name: 'Fortitude Valley', postcode: '4006', regionCode: 'GBRI', stateCode: 'QLD', coordinates: [153.0344, -27.4558] },
  
  // Perth Suburbs
  { name: 'Perth CBD', postcode: '6000', regionCode: 'GPER', stateCode: 'WA', coordinates: [115.8605, -31.9505] },
  { name: 'Fremantle', postcode: '6160', regionCode: 'GPER', stateCode: 'WA', coordinates: [115.7475, -32.0569] },
  
  // Adelaide Suburbs
  { name: 'Adelaide CBD', postcode: '5000', regionCode: 'GADE', stateCode: 'SA', coordinates: [138.6007, -34.9285] },
  { name: 'Glenelg', postcode: '5045', regionCode: 'GADE', stateCode: 'SA', coordinates: [138.5140, -34.9809] },
  
  // Hobart
  { name: 'Hobart CBD', postcode: '7000', regionCode: 'GHOB', stateCode: 'TAS', coordinates: [147.3272, -42.8821] },
  
  // Canberra
  { name: 'Canberra City', postcode: '2601', regionCode: 'CANB', stateCode: 'ACT', coordinates: [149.1300, -35.2809] },
  { name: 'Belconnen', postcode: '2617', regionCode: 'CANB', stateCode: 'ACT', coordinates: [149.0661, -35.2385] },
  
  // Darwin
  { name: 'Darwin CBD', postcode: '0800', regionCode: 'GDAR', stateCode: 'NT', coordinates: [130.8456, -12.4634] }
];

/**
 * Sample Service Areas
 */
const sampleServiceAreas = [
  // Sydney Service Areas
  { name: 'Sydney Inner West', code: 'SYD-IW', regionCode: 'GSYD', stateCode: 'NSW', description: 'Inner West suburbs of Sydney' },
  { name: 'Sydney Eastern Suburbs', code: 'SYD-ES', regionCode: 'GSYD', stateCode: 'NSW', description: 'Eastern suburbs including Bondi' },
  { name: 'Sydney Western Suburbs', code: 'SYD-WS', regionCode: 'GSYD', stateCode: 'NSW', description: 'Western suburbs including Parramatta' },
  { name: 'Sydney Northern Beaches', code: 'SYD-NB', regionCode: 'GSYD', stateCode: 'NSW', description: 'Northern beaches area' },
  
  // Melbourne Service Areas
  { name: 'Melbourne Inner City', code: 'MEL-IC', regionCode: 'GMEL', stateCode: 'VIC', description: 'Inner Melbourne suburbs' },
  { name: 'Melbourne Bayside', code: 'MEL-BS', regionCode: 'GMEL', stateCode: 'VIC', description: 'Bayside suburbs including St Kilda' },
  { name: 'Melbourne Eastern Suburbs', code: 'MEL-ES', regionCode: 'GMEL', stateCode: 'VIC', description: 'Eastern suburbs' },
  { name: 'Melbourne Western Suburbs', code: 'MEL-WS', regionCode: 'GMEL', stateCode: 'VIC', description: 'Western suburbs' },
  
  // Brisbane Service Areas
  { name: 'Brisbane Inner City', code: 'BNE-IC', regionCode: 'GBRI', stateCode: 'QLD', description: 'Inner Brisbane suburbs' },
  { name: 'Brisbane Southside', code: 'BNE-SS', regionCode: 'GBRI', stateCode: 'QLD', description: 'South Brisbane suburbs' },
  { name: 'Brisbane Northside', code: 'BNE-NS', regionCode: 'GBRI', stateCode: 'QLD', description: 'North Brisbane suburbs' },
  
  // Perth Service Areas
  { name: 'Perth Metropolitan', code: 'PER-MET', regionCode: 'GPER', stateCode: 'WA', description: 'Perth metropolitan area' },
  
  // Adelaide Service Areas
  { name: 'Adelaide Metropolitan', code: 'ADL-MET', regionCode: 'GADE', stateCode: 'SA', description: 'Adelaide metropolitan area' },
  
  // Other capitals
  { name: 'Hobart Metropolitan', code: 'HBA-MET', regionCode: 'GHOB', stateCode: 'TAS', description: 'Greater Hobart' },
  { name: 'Canberra Metropolitan', code: 'CBR-MET', regionCode: 'CANB', stateCode: 'ACT', description: 'ACT region' },
  { name: 'Darwin Metropolitan', code: 'DRW-MET', regionCode: 'GDAR', stateCode: 'NT', description: 'Greater Darwin' }
];

/**
 * Seed States
 */
export const seedStates = async (): Promise<Map<string, mongoose.Types.ObjectId>> => {
  try {
    logger.info('Seeding Australian states...');
    
    const stateMap = new Map<string, mongoose.Types.ObjectId>();
    
    for (const stateData of australianStates) {
      const existingState = await State.findOne({ code: stateData.code });
      
      if (existingState) {
        stateMap.set(stateData.code, existingState._id as mongoose.Types.ObjectId);
        logger.info(`State ${stateData.code} already exists`);
      } else {
        const state = await State.create(stateData);
        stateMap.set(stateData.code, state._id as mongoose.Types.ObjectId);
        logger.info(`Created state: ${stateData.name}`);
      }
    }
    
    logger.info(`Seeded ${stateMap.size} states`);
    return stateMap;
  } catch (error) {
    logger.error('Error seeding states:', error);
    throw error;
  }
};

/**
 * Seed Regions
 */
export const seedRegions = async (
  stateMap: Map<string, mongoose.Types.ObjectId>
): Promise<Map<string, mongoose.Types.ObjectId>> => {
  try {
    logger.info('Seeding Australian regions...');
    
    const regionMap = new Map<string, mongoose.Types.ObjectId>();
    
    for (const regionData of australianRegions) {
      const stateId = stateMap.get(regionData.stateCode);
      
      if (!stateId) {
        logger.warn(`State ${regionData.stateCode} not found for region ${regionData.code}`);
        continue;
      }
      
      const existingRegion = await Region.findOne({ 
        code: regionData.code, 
        stateId 
      });
      
      if (existingRegion) {
        regionMap.set(regionData.code, existingRegion._id as mongoose.Types.ObjectId);
        logger.info(`Region ${regionData.code} already exists`);
      } else {
        const region = await Region.create({
          name: regionData.name,
          code: regionData.code,
          stateId,
          description: regionData.description
        });
        regionMap.set(regionData.code, region._id as mongoose.Types.ObjectId);
        logger.info(`Created region: ${regionData.name}`);
      }
    }
    
    logger.info(`Seeded ${regionMap.size} regions`);
    return regionMap;
  } catch (error) {
    logger.error('Error seeding regions:', error);
    throw error;
  }
};

/**
 * Seed Suburbs
 */
export const seedSuburbs = async (
  stateMap: Map<string, mongoose.Types.ObjectId>,
  regionMap: Map<string, mongoose.Types.ObjectId>
): Promise<void> => {
  try {
    logger.info('Seeding sample suburbs...');
    
    const suburbMap = new Map<string, mongoose.Types.ObjectId>();
    
    for (const suburbData of sampleSuburbs) {
      const stateId = stateMap.get(suburbData.stateCode);
      const regionId = regionMap.get(suburbData.regionCode);
      
      if (!stateId || !regionId) {
        logger.warn(`State or Region not found for suburb ${suburbData.name}`);
        continue;
      }
      
      const existingSuburb = await Suburb.findOne({ 
        name: suburbData.name, 
        postcode: suburbData.postcode,
        stateId 
      });
      
      if (existingSuburb) {
        suburbMap.set(`${suburbData.name}-${suburbData.postcode}`, existingSuburb._id as mongoose.Types.ObjectId);
        logger.info(`Suburb ${suburbData.name} already exists`);
      } else {
        const suburb = await Suburb.create({
          name: suburbData.name,
          postcode: suburbData.postcode,
          regionId,
          stateId,
          location: {
            type: 'Point',
            coordinates: suburbData.coordinates // [longitude, latitude]
          }
        });
        suburbMap.set(`${suburbData.name}-${suburbData.postcode}`, suburb._id as mongoose.Types.ObjectId);
        logger.info(`Created suburb: ${suburbData.name}, ${suburbData.postcode}`);
      }
    }
    
    logger.info(`Seeded ${suburbMap.size} suburbs`);
  } catch (error) {
    logger.error('Error seeding suburbs:', error);
    throw error;
  }
};

/**
 * Seed Service Areas
 */
export const seedServiceAreas = async (
  stateMap: Map<string, mongoose.Types.ObjectId>,
  regionMap: Map<string, mongoose.Types.ObjectId>
): Promise<void> => {
  try {
    logger.info('Seeding service areas...');
    
    for (const areaData of sampleServiceAreas) {
      const stateId = stateMap.get(areaData.stateCode);
      const regionId = regionMap.get(areaData.regionCode);
      
      if (!stateId || !regionId) {
        logger.warn(`State or Region not found for service area ${areaData.code}`);
        continue;
      }
      
      const existingArea = await ServiceArea.findOne({ 
        code: areaData.code,
        regionId
      });
      
      if (existingArea) {
        logger.info(`Service area ${areaData.code} already exists`);
      } else {
        await ServiceArea.create({
          name: areaData.name,
          code: areaData.code,
          regionId,
          stateId,
          suburbIds: [], // Will be populated later as suburbs are added
          description: areaData.description
        });
        logger.info(`Created service area: ${areaData.name}`);
      }
    }
    
    logger.info('Service areas seeded successfully');
  } catch (error) {
    logger.error('Error seeding service areas:', error);
    throw error;
  }
};

/**
 * Main seed function
 */
export const seedLocationData = async (): Promise<void> => {
  try {
    logger.info('Starting location data seeding...');
    
    const stateMap = await seedStates();
    const regionMap = await seedRegions(stateMap);
    await seedSuburbs(stateMap, regionMap);
    await seedServiceAreas(stateMap, regionMap);
    
    logger.info('Location data seeding completed successfully');
  } catch (error) {
    logger.error('Error in location data seeding:', error);
    throw error;
  }
};

