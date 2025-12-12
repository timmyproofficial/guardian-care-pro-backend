/**
 * Column Mapper Utility
 * Flexible column mapping for roster file parsing
 * Maps various column name variations to standardized internal field names
 */

import { COLUMN_MAPPINGS } from '../types/roster.types';

/**
 * Normalize a column name by converting to lowercase and removing special characters
 */
export function normalizeColumnName(columnName: string): string {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')        // Replace multiple underscores with single
    .replace(/^_|_$/g, '');     // Remove leading/trailing underscores
}

/**
 * Find the best matching internal field name for a given column header
 * @param columnHeader - The column header from the uploaded file
 * @returns The internal field name or null if no match found
 */
export function mapColumnToField(columnHeader: string): string | null {
  const normalizedHeader = normalizeColumnName(columnHeader);
  const headerLower = columnHeader.toLowerCase().trim();
  
  for (const [fieldName, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeColumnName(variation);
      const variationLower = variation.toLowerCase().trim();
      
      // Exact match (case-insensitive)
      if (headerLower === variationLower) {
        return fieldName;
      }
      
      // Normalized match
      if (normalizedHeader === normalizedVariation) {
        return fieldName;
      }
      
      // Contains match (for headers like "Worker Name:" or "(Worker)")
      if (headerLower.includes(variationLower) || variationLower.includes(headerLower)) {
        return fieldName;
      }
    }
  }
  
  return null;
}

/**
 * Create a mapping from source columns to internal fields
 * @param sourceColumns - Array of column headers from the uploaded file
 * @returns Map of source column name to internal field name
 */
export function createColumnMapping(sourceColumns: string[]): Map<string, string> {
  const mapping = new Map<string, string>();
  const usedFields = new Set<string>();
  
  for (const column of sourceColumns) {
    const fieldName = mapColumnToField(column);
    
    if (fieldName && !usedFields.has(fieldName)) {
      mapping.set(column, fieldName);
      usedFields.add(fieldName);
    }
  }
  
  return mapping;
}

/**
 * Get unmapped columns (columns that couldn't be matched to internal fields)
 */
export function getUnmappedColumns(
  sourceColumns: string[],
  mapping: Map<string, string>
): string[] {
  return sourceColumns.filter(col => !mapping.has(col));
}

/**
 * Get missing required fields that weren't found in the mapping
 */
export function getMissingRequiredFields(
  mapping: Map<string, string>,
  requiredFields: string[]
): string[] {
  const mappedFields = new Set(mapping.values());
  return requiredFields.filter(field => !mappedFields.has(field));
}

/**
 * Validate that all required fields are present in the mapping
 */
export function validateMapping(
  mapping: Map<string, string>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = getMissingRequiredFields(mapping, requiredFields);
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Apply column mapping to transform a raw row into standardized format
 * @param rawRow - The raw row data with original column names
 * @param mapping - The column mapping
 * @returns Object with internal field names as keys
 */
export function applyMapping(
  rawRow: Record<string, any>,
  mapping: Map<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [sourceColumn, fieldName] of mapping.entries()) {
    if (rawRow.hasOwnProperty(sourceColumn)) {
      result[fieldName] = rawRow[sourceColumn];
    }
  }
  
  return result;
}

/**
 * Suggest column mappings based on column headers
 * Returns a human-readable suggestion for unmapped columns
 */
export function suggestMappings(unmappedColumns: string[]): Array<{
  column: string;
  suggestions: string[];
}> {
  const suggestions: Array<{ column: string; suggestions: string[] }> = [];
  
  for (const column of unmappedColumns) {
    const columnLower = column.toLowerCase();
    const possibleMatches: string[] = [];
    
    // Check for partial matches
    for (const [fieldName, variations] of Object.entries(COLUMN_MAPPINGS)) {
      for (const variation of variations) {
        if (
          columnLower.includes(variation.split('_')[0]) ||
          variation.toLowerCase().includes(columnLower.split('_')[0])
        ) {
          if (!possibleMatches.includes(fieldName)) {
            possibleMatches.push(fieldName);
          }
        }
      }
    }
    
    if (possibleMatches.length > 0) {
      suggestions.push({ column, suggestions: possibleMatches });
    }
  }
  
  return suggestions;
}

/**
 * Get a summary of the column mapping
 */
export function getMappingSummary(
  sourceColumns: string[],
  mapping: Map<string, string>
): {
  mapped: Array<{ source: string; target: string }>;
  unmapped: string[];
  coverage: number;
} {
  const mapped: Array<{ source: string; target: string }> = [];
  const unmapped: string[] = [];
  
  for (const column of sourceColumns) {
    if (mapping.has(column)) {
      mapped.push({ source: column, target: mapping.get(column)! });
    } else {
      unmapped.push(column);
    }
  }
  
  return {
    mapped,
    unmapped,
    coverage: sourceColumns.length > 0 
      ? (mapped.length / sourceColumns.length) * 100 
      : 0
  };
}

