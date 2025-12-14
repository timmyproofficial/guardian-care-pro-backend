/**
 * Location Seed Data
 * Seeds Australian states, regions, suburbs, and service areas
 * Based on AU Tier 3 Taxonomy
 */

import mongoose from 'mongoose';
import State from '../models/location/state.model';
import Region from '../models/location/region.model';
// import Suburb from '../models/location/suburb.model';
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
 * Regions by State (Extracted from PDF)
 */
const australianRegions = [
  // ACT Regions
  { name: 'Australian Capital Territory', code: 'ACT-REG', stateCode: 'ACT', description: 'Canberra and surrounding areas' },
  
  // NSW Regions
  { name: 'Central Coast', code: 'NSW-CC', stateCode: 'NSW', description: 'Central Coast region' },
  { name: 'Central West', code: 'NSW-CW', stateCode: 'NSW', description: 'Central West region' },
  { name: 'Far West', code: 'NSW-FW', stateCode: 'NSW', description: 'Far West region' },
  { name: 'Hunter', code: 'NSW-HUN', stateCode: 'NSW', description: 'Hunter region' },
  { name: 'Illawarra', code: 'NSW-ILL', stateCode: 'NSW', description: 'Illawarra region' },
  { name: 'New England', code: 'NSW-NE', stateCode: 'NSW', description: 'New England region' },
  { name: 'North Coast', code: 'NSW-NC', stateCode: 'NSW', description: 'North Coast region' },
  { name: 'Riverina', code: 'NSW-RIV', stateCode: 'NSW', description: 'Riverina region' },
  { name: 'South Coast', code: 'NSW-SC', stateCode: 'NSW', description: 'South Coast region' },
  { name: 'Southern Tablelands', code: 'NSW-ST', stateCode: 'NSW', description: 'Southern Tablelands region' },
  { name: 'Sydney', code: 'NSW-SYD', stateCode: 'NSW', description: 'Greater Sydney region' },
  
  // NT Regions
  { name: 'Central Australia', code: 'NT-CA', stateCode: 'NT', description: 'Central Australia region' },
  { name: 'Top End', code: 'NT-TE', stateCode: 'NT', description: 'Top End region' },
  
  // QLD Regions
  { name: 'Brisbane', code: 'QLD-BRI', stateCode: 'QLD', description: 'Greater Brisbane region' },
  { name: 'Central Queensland', code: 'QLD-CQ', stateCode: 'QLD', description: 'Central Queensland region' },
  { name: 'Darling Downs', code: 'QLD-DD', stateCode: 'QLD', description: 'Darling Downs region' },
  { name: 'Far North Queensland', code: 'QLD-FNQ', stateCode: 'QLD', description: 'Far North Queensland region' },
  { name: 'Gold Coast', code: 'QLD-GC', stateCode: 'QLD', description: 'Gold Coast region' },
  { name: 'Mackay-Whitsunday', code: 'QLD-MW', stateCode: 'QLD', description: 'Mackay-Whitsunday region' },
  { name: 'North Queensland', code: 'QLD-NQ', stateCode: 'QLD', description: 'North Queensland region' },
  { name: 'Sunshine Coast', code: 'QLD-SC', stateCode: 'QLD', description: 'Sunshine Coast region' },
  { name: 'Wide Bay', code: 'QLD-WB', stateCode: 'QLD', description: 'Wide Bay region' },
  
  // SA Regions
  { name: 'Adelaide', code: 'SA-ADL', stateCode: 'SA', description: 'Greater Adelaide region' },
  { name: 'Eyre Peninsula', code: 'SA-EP', stateCode: 'SA', description: 'Eyre Peninsula region' },
  { name: 'Limestone Coast', code: 'SA-LC', stateCode: 'SA', description: 'Limestone Coast region' },
  { name: 'Murray', code: 'SA-MUR', stateCode: 'SA', description: 'Murray region' },
  
  // TAS Regions
  { name: 'Greater Hobart', code: 'TAS-HOB', stateCode: 'TAS', description: 'Greater Hobart region' },
  { name: 'North West Tasmania', code: 'TAS-NW', stateCode: 'TAS', description: 'North West Tasmania region' },
  { name: 'Northern Tasmania', code: 'TAS-NT', stateCode: 'TAS', description: 'Northern Tasmania region' },
  
  // VIC Regions
  { name: 'Central Highlands', code: 'VIC-CH', stateCode: 'VIC', description: 'Central Highlands region' },
  { name: 'Geelong', code: 'VIC-GEE', stateCode: 'VIC', description: 'Geelong region' },
  { name: 'Gippsland', code: 'VIC-GIP', stateCode: 'VIC', description: 'Gippsland region' },
  { name: 'Goulburn Valley', code: 'VIC-GV', stateCode: 'VIC', description: 'Goulburn Valley region' },
  { name: 'Loddon', code: 'VIC-LOD', stateCode: 'VIC', description: 'Loddon region' },
  { name: 'Melbourne', code: 'VIC-MEL', stateCode: 'VIC', description: 'Greater Melbourne region' },
  { name: 'North West Victoria', code: 'VIC-NW', stateCode: 'VIC', description: 'North West Victoria region' },
  { name: 'South West Victoria', code: 'VIC-SW', stateCode: 'VIC', description: 'South West Victoria region' },
  
  // WA Regions
  { name: 'Goldfields', code: 'WA-GOL', stateCode: 'WA', description: 'Goldfields region' },
  { name: 'Great Southern', code: 'WA-GS', stateCode: 'WA', description: 'Great Southern region' },
  { name: 'Kimberley', code: 'WA-KIM', stateCode: 'WA', description: 'Kimberley region' },
  { name: 'Mid West', code: 'WA-MW', stateCode: 'WA', description: 'Mid West region' },
  { name: 'Peel', code: 'WA-PEE', stateCode: 'WA', description: 'Peel region' },
  { name: 'Perth', code: 'WA-PER', stateCode: 'WA', description: 'Greater Perth region' },
  { name: 'Pilbara', code: 'WA-PIL', stateCode: 'WA', description: 'Pilbara region' },
  { name: 'South West WA', code: 'WA-SW', stateCode: 'WA', description: 'South West WA region' }
];

/**
 * Service Areas by Region (Extracted from PDF)
 */
const serviceAreasByRegion = [
  // ACT
  { name: 'Canberra Region', code: 'ACT-CANB', regionCode: 'ACT-REG', stateCode: 'ACT', description: 'Canberra and surrounds' },
  
  // NSW - Central Coast
  { name: 'Gosford', code: 'NSW-CC-GOS', regionCode: 'NSW-CC', stateCode: 'NSW', description: 'Gosford area' },
  
  // NSW - Central West
  { name: 'Bathurst', code: 'NSW-CW-BAT', regionCode: 'NSW-CW', stateCode: 'NSW', description: 'Bathurst area' },
  { name: 'Dubbo', code: 'NSW-CW-DUB', regionCode: 'NSW-CW', stateCode: 'NSW', description: 'Dubbo area' },
  { name: 'Orange', code: 'NSW-CW-ORA', regionCode: 'NSW-CW', stateCode: 'NSW', description: 'Orange area' },
  
  // NSW - Far West
  { name: 'Broken Hill', code: 'NSW-FW-BRH', regionCode: 'NSW-FW', stateCode: 'NSW', description: 'Broken Hill area' },
  
  // NSW - Hunter
  { name: 'Lake Macquarie', code: 'NSW-HUN-LM', regionCode: 'NSW-HUN', stateCode: 'NSW', description: 'Lake Macquarie area' },
  { name: 'Maitland', code: 'NSW-HUN-MAI', regionCode: 'NSW-HUN', stateCode: 'NSW', description: 'Maitland area' },
  { name: 'Newcastle', code: 'NSW-HUN-NEW', regionCode: 'NSW-HUN', stateCode: 'NSW', description: 'Newcastle area' },
  
  // NSW - Illawarra
  { name: 'Shellharbour', code: 'NSW-ILL-SHE', regionCode: 'NSW-ILL', stateCode: 'NSW', description: 'Shellharbour area' },
  { name: 'Wollongong', code: 'NSW-ILL-WOL', regionCode: 'NSW-ILL', stateCode: 'NSW', description: 'Wollongong area' },
  
  // NSW - New England
  { name: 'Armidale', code: 'NSW-NE-ARM', regionCode: 'NSW-NE', stateCode: 'NSW', description: 'Armidale area' },
  { name: 'Tamworth', code: 'NSW-NE-TAM', regionCode: 'NSW-NE', stateCode: 'NSW', description: 'Tamworth area' },
  
  // NSW - North Coast
  { name: 'Coffs Harbour', code: 'NSW-NC-COF', regionCode: 'NSW-NC', stateCode: 'NSW', description: 'Coffs Harbour area' },
  { name: 'Port Macquarie', code: 'NSW-NC-PM', regionCode: 'NSW-NC', stateCode: 'NSW', description: 'Port Macquarie area' },
  { name: 'Tweed Heads', code: 'NSW-NC-TW', regionCode: 'NSW-NC', stateCode: 'NSW', description: 'Tweed Heads area' },
  
  // NSW - Riverina
  { name: 'Albury', code: 'NSW-RIV-ALB', regionCode: 'NSW-RIV', stateCode: 'NSW', description: 'Albury area' },
  { name: 'Griffith', code: 'NSW-RIV-GRI', regionCode: 'NSW-RIV', stateCode: 'NSW', description: 'Griffith area' },
  { name: 'Wagga Wagga', code: 'NSW-RIV-WAG', regionCode: 'NSW-RIV', stateCode: 'NSW', description: 'Wagga Wagga area' },
  
  // NSW - South Coast
  { name: 'Batemans Bay', code: 'NSW-SC-BAT', regionCode: 'NSW-SC', stateCode: 'NSW', description: 'Batemans Bay area' },
  
  // NSW - Southern Tablelands
  { name: 'Queanbeyan', code: 'NSW-ST-QUE', regionCode: 'NSW-ST', stateCode: 'NSW', description: 'Queanbeyan area' },
  
  // NSW - Sydney
  { name: 'Eastern Suburbs', code: 'NSW-SYD-ES', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'Sydney Eastern Suburbs' },
  { name: 'Inner West', code: 'NSW-SYD-IW', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'Sydney Inner West' },
  { name: 'North Shore', code: 'NSW-SYD-NS', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'Sydney North Shore' },
  { name: 'Northern Beaches', code: 'NSW-SYD-NB', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'Sydney Northern Beaches' },
  { name: 'South West Sydney', code: 'NSW-SYD-SW', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'South West Sydney' },
  { name: 'Western Sydney', code: 'NSW-SYD-WS', regionCode: 'NSW-SYD', stateCode: 'NSW', description: 'Western Sydney' },
  
  // NT - Central Australia
  { name: 'Alice Springs', code: 'NT-CA-ALS', regionCode: 'NT-CA', stateCode: 'NT', description: 'Alice Springs area' },
  
  // NT - Top End
  { name: 'Greater Darwin', code: 'NT-TE-DAR', regionCode: 'NT-TE', stateCode: 'NT', description: 'Greater Darwin area' },
  { name: 'Katherine', code: 'NT-TE-KAT', regionCode: 'NT-TE', stateCode: 'NT', description: 'Katherine area' },
  
  // QLD - Brisbane
  { name: 'Inner Brisbane', code: 'QLD-BRI-IB', regionCode: 'QLD-BRI', stateCode: 'QLD', description: 'Inner Brisbane' },
  { name: 'Logan-Ipswich', code: 'QLD-BRI-LI', regionCode: 'QLD-BRI', stateCode: 'QLD', description: 'Logan-Ipswich area' },
  { name: 'North Brisbane', code: 'QLD-BRI-NB', regionCode: 'QLD-BRI', stateCode: 'QLD', description: 'North Brisbane' },
  { name: 'South Brisbane', code: 'QLD-BRI-SB', regionCode: 'QLD-BRI', stateCode: 'QLD', description: 'South Brisbane' },
  
  // QLD - Central Queensland
  { name: 'Gladstone', code: 'QLD-CQ-GLA', regionCode: 'QLD-CQ', stateCode: 'QLD', description: 'Gladstone area' },
  { name: 'Rockhampton', code: 'QLD-CQ-ROC', regionCode: 'QLD-CQ', stateCode: 'QLD', description: 'Rockhampton area' },
  
  // QLD - Darling Downs
  { name: 'Toowoomba', code: 'QLD-DD-TOO', regionCode: 'QLD-DD', stateCode: 'QLD', description: 'Toowoomba area' },
  
  // QLD - Far North Queensland
  { name: 'Cairns', code: 'QLD-FNQ-CAI', regionCode: 'QLD-FNQ', stateCode: 'QLD', description: 'Cairns area' },
  
  // QLD - Gold Coast
  { name: 'Central Gold Coast', code: 'QLD-GC-CGC', regionCode: 'QLD-GC', stateCode: 'QLD', description: 'Central Gold Coast' },
  { name: 'North Gold Coast', code: 'QLD-GC-NGC', regionCode: 'QLD-GC', stateCode: 'QLD', description: 'North Gold Coast' },
  { name: 'South Gold Coast', code: 'QLD-GC-SGC', regionCode: 'QLD-GC', stateCode: 'QLD', description: 'South Gold Coast' },
  
  // QLD - Mackay-Whitsunday
  { name: 'Mackay', code: 'QLD-MW-MAC', regionCode: 'QLD-MW', stateCode: 'QLD', description: 'Mackay area' },
  
  // QLD - North Queensland
  { name: 'Townsville', code: 'QLD-NQ-TOW', regionCode: 'QLD-NQ', stateCode: 'QLD', description: 'Townsville area' },
  
  // QLD - Sunshine Coast
  { name: 'Maroochydore', code: 'QLD-SC-MAR', regionCode: 'QLD-SC', stateCode: 'QLD', description: 'Maroochydore area' },
  { name: 'Noosa', code: 'QLD-SC-NOO', regionCode: 'QLD-SC', stateCode: 'QLD', description: 'Noosa area' },
  
  // QLD - Wide Bay
  { name: 'Bundaberg', code: 'QLD-WB-BUN', regionCode: 'QLD-WB', stateCode: 'QLD', description: 'Bundaberg area' },
  { name: 'Hervey Bay', code: 'QLD-WB-HB', regionCode: 'QLD-WB', stateCode: 'QLD', description: 'Hervey Bay area' },
  
  // SA - Adelaide
  { name: 'East Adelaide', code: 'SA-ADL-E', regionCode: 'SA-ADL', stateCode: 'SA', description: 'East Adelaide' },
  { name: 'North Adelaide', code: 'SA-ADL-N', regionCode: 'SA-ADL', stateCode: 'SA', description: 'North Adelaide' },
  { name: 'South Adelaide', code: 'SA-ADL-S', regionCode: 'SA-ADL', stateCode: 'SA', description: 'South Adelaide' },
  { name: 'West Adelaide', code: 'SA-ADL-W', regionCode: 'SA-ADL', stateCode: 'SA', description: 'West Adelaide' },
  
  // SA - Eyre Peninsula
  { name: 'Port Augusta', code: 'SA-EP-PA', regionCode: 'SA-EP', stateCode: 'SA', description: 'Port Augusta area' },
  { name: 'Port Lincoln', code: 'SA-EP-PL', regionCode: 'SA-EP', stateCode: 'SA', description: 'Port Lincoln area' },
  { name: 'Whyalla', code: 'SA-EP-WHY', regionCode: 'SA-EP', stateCode: 'SA', description: 'Whyalla area' },
  
  // SA - Limestone Coast
  { name: 'Mount Gambier', code: 'SA-LC-MG', regionCode: 'SA-LC', stateCode: 'SA', description: 'Mount Gambier area' },
  
  // SA - Murray
  { name: 'Murray Bridge', code: 'SA-MUR-MB', regionCode: 'SA-MUR', stateCode: 'SA', description: 'Murray Bridge area' },
  
  // TAS - Greater Hobart
  { name: 'Hobart', code: 'TAS-HOB-HOB', regionCode: 'TAS-HOB', stateCode: 'TAS', description: 'Hobart area' },
  
  // TAS - North West Tasmania
  { name: 'Burnie', code: 'TAS-NW-BUR', regionCode: 'TAS-NW', stateCode: 'TAS', description: 'Burnie area' },
  { name: 'Devonport', code: 'TAS-NW-DEV', regionCode: 'TAS-NW', stateCode: 'TAS', description: 'Devonport area' },
  
  // TAS - Northern Tasmania
  { name: 'Launceston', code: 'TAS-NT-LAU', regionCode: 'TAS-NT', stateCode: 'TAS', description: 'Launceston area' },
  
  // VIC - Central Highlands
  { name: 'Ballarat', code: 'VIC-CH-BAL', regionCode: 'VIC-CH', stateCode: 'VIC', description: 'Ballarat area' },
  
  // VIC - Geelong
  { name: 'Greater Geelong', code: 'VIC-GEE-GG', regionCode: 'VIC-GEE', stateCode: 'VIC', description: 'Greater Geelong area' },
  { name: 'Surf Coast', code: 'VIC-GEE-SC', regionCode: 'VIC-GEE', stateCode: 'VIC', description: 'Surf Coast area' },
  
  // VIC - Gippsland
  { name: 'Bairnsdale', code: 'VIC-GIP-BAI', regionCode: 'VIC-GIP', stateCode: 'VIC', description: 'Bairnsdale area' },
  { name: 'Latrobe Valley', code: 'VIC-GIP-LV', regionCode: 'VIC-GIP', stateCode: 'VIC', description: 'Latrobe Valley area' },
  
  // VIC - Goulburn Valley
  { name: 'Shepparton', code: 'VIC-GV-SHE', regionCode: 'VIC-GV', stateCode: 'VIC', description: 'Shepparton area' },
  { name: 'Wodonga', code: 'VIC-GV-WOD', regionCode: 'VIC-GV', stateCode: 'VIC', description: 'Wodonga area' },
  
  // VIC - Loddon
  { name: 'Bendigo', code: 'VIC-LOD-BEN', regionCode: 'VIC-LOD', stateCode: 'VIC', description: 'Bendigo area' },
  
  // VIC - Melbourne
  { name: 'Eastern Suburbs', code: 'VIC-MEL-ES', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Melbourne Eastern Suburbs' },
  { name: 'Inner Melbourne', code: 'VIC-MEL-IM', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Inner Melbourne' },
  { name: 'Mornington Peninsula', code: 'VIC-MEL-MP', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Mornington Peninsula' },
  { name: 'Northern Suburbs', code: 'VIC-MEL-NS', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Melbourne Northern Suburbs' },
  { name: 'South Eastern Suburbs', code: 'VIC-MEL-SES', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Melbourne South Eastern Suburbs' },
  { name: 'Western Suburbs', code: 'VIC-MEL-WS', regionCode: 'VIC-MEL', stateCode: 'VIC', description: 'Melbourne Western Suburbs' },
  
  // VIC - North West Victoria
  { name: 'Mildura', code: 'VIC-NW-MIL', regionCode: 'VIC-NW', stateCode: 'VIC', description: 'Mildura area' },
  
  // VIC - South West Victoria
  { name: 'Warrnambool', code: 'VIC-SW-WAR', regionCode: 'VIC-SW', stateCode: 'VIC', description: 'Warrnambool area' },
  
  // WA - Goldfields
  { name: 'Kalgoorlie', code: 'WA-GOL-KAL', regionCode: 'WA-GOL', stateCode: 'WA', description: 'Kalgoorlie area' },
  
  // WA - Great Southern
  { name: 'Albany', code: 'WA-GS-ALB', regionCode: 'WA-GS', stateCode: 'WA', description: 'Albany area' },
  
  // WA - Kimberley
  { name: 'Broome', code: 'WA-KIM-BRO', regionCode: 'WA-KIM', stateCode: 'WA', description: 'Broome area' },
  
  // WA - Mid West
  { name: 'Geraldton', code: 'WA-MW-GER', regionCode: 'WA-MW', stateCode: 'WA', description: 'Geraldton area' },
  
  // WA - Peel
  { name: 'Mandurah', code: 'WA-PEE-MAN', regionCode: 'WA-PEE', stateCode: 'WA', description: 'Mandurah area' },
  
  // WA - Perth
  { name: 'East Perth', code: 'WA-PER-E', regionCode: 'WA-PER', stateCode: 'WA', description: 'East Perth' },
  { name: 'Fremantle', code: 'WA-PER-FRE', regionCode: 'WA-PER', stateCode: 'WA', description: 'Fremantle area' },
  { name: 'North Perth', code: 'WA-PER-N', regionCode: 'WA-PER', stateCode: 'WA', description: 'North Perth' },
  { name: 'South Perth', code: 'WA-PER-S', regionCode: 'WA-PER', stateCode: 'WA', description: 'South Perth' },
  { name: 'West Perth', code: 'WA-PER-W', regionCode: 'WA-PER', stateCode: 'WA', description: 'West Perth' },
  
  // WA - Pilbara
  { name: 'Karratha', code: 'WA-PIL-KAR', regionCode: 'WA-PIL', stateCode: 'WA', description: 'Karratha area' },
  { name: 'Port Hedland', code: 'WA-PIL-PH', regionCode: 'WA-PIL', stateCode: 'WA', description: 'Port Hedland area' },
  
  // WA - South West WA
  { name: 'Bunbury', code: 'WA-SW-BUN', regionCode: 'WA-SW', stateCode: 'WA', description: 'Bunbury area' },
  { name: 'Busselton', code: 'WA-SW-BUS', regionCode: 'WA-SW', stateCode: 'WA', description: 'Busselton area' }
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
 * Seed Service Areas
 */
export const seedServiceAreas = async (
  stateMap: Map<string, mongoose.Types.ObjectId>,
  regionMap: Map<string, mongoose.Types.ObjectId>
): Promise<void> => {
  try {
    logger.info('Seeding service areas...');
    
    for (const areaData of serviceAreasByRegion) {
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
    await seedServiceAreas(stateMap, regionMap);
    
    logger.info('Location data seeding completed successfully');
  } catch (error) {
    logger.error('Error in location data seeding:', error);
    throw error;
  }
};