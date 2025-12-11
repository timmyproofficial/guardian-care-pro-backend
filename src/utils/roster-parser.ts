/**
 * Roster Parser Utility
 * Parses CSV and Excel roster files with flexible column mapping
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import moment from 'moment';
import {
  ParsedShiftRow,
  RosterParseResult,
  RosterFileType,
  DATE_FORMAT_PATTERNS,
  TIME_FORMAT_PATTERNS,
  REQUIRED_SHIFT_FIELDS,
  ParsingWarning
} from '../types/roster.types';
import {
  createColumnMapping,
  applyMapping,
  validateMapping,
  getMappingSummary
} from './column-mapper';
import logger from './logger';

/**
 * Determine file type from filename or MIME type
 */
export function determineFileType(
  filename: string,
  mimeType?: string
): RosterFileType {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (extension === 'csv' || mimeType === 'text/csv') {
    return RosterFileType.CSV;
  }
  
  if (
    extension === 'xlsx' ||
    extension === 'xls' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return RosterFileType.EXCEL;
  }
  
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return RosterFileType.PDF;
  }
  
  if (
    ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'].includes(extension || '') ||
    mimeType?.startsWith('image/')
  ) {
    return RosterFileType.IMAGE;
  }
  
  // Default to CSV for unknown types
  return RosterFileType.CSV;
}

/**
 * Parse a CSV file buffer
 */
export function parseCSV(buffer: Buffer): Record<string, any>[] {
  const csvString = buffer.toString('utf-8');
  
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value?.trim() || ''
  });
  
  if (result.errors.length > 0) {
    logger.warn('CSV parsing warnings:', result.errors);
  }
  
  return result.data as Record<string, any>[];
}

/**
 * Parse an Excel file buffer
 */
export function parseExcel(buffer: Buffer): Record<string, any>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });
  
  return jsonData as Record<string, any>[];
}

/**
 * Try to parse a date string using multiple format patterns
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const cleaned = dateStr.trim();
  
  // Try each format pattern
  for (const format of DATE_FORMAT_PATTERNS) {
    const parsed = moment(cleaned, format, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }
  
  // Try native Date parsing as fallback
  const nativeDate = new Date(cleaned);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }
  
  return null;
}

/**
 * Try to parse a time string and convert to HH:mm format
 */
export function parseTime(timeStr: string): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const cleaned = timeStr.trim().toUpperCase();
  
  // Try each format pattern
  for (const format of TIME_FORMAT_PATTERNS) {
    const parsed = moment(cleaned, format, true);
    if (parsed.isValid()) {
      return parsed.format('HH:mm');
    }
  }
  
  // Try to extract time from common patterns
  const timeMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3]?.toUpperCase();
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Calculate shift duration in minutes from start and end times
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = moment(startTime, 'HH:mm');
  let end = moment(endTime, 'HH:mm');
  
  // Handle overnight shifts
  if (end.isBefore(start)) {
    end.add(1, 'day');
  }
  
  return end.diff(start, 'minutes');
}

/**
 * Normalize phone number to E.164 format (Australian)
 */
export function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Handle Australian mobile numbers
  if (cleaned.startsWith('04')) {
    cleaned = '+61' + cleaned.substring(1);
  } else if (cleaned.startsWith('614')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('61') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // Validate length for Australian numbers
  if (cleaned.startsWith('+61') && cleaned.length === 12) {
    return cleaned;
  }
  
  // Return original if can't normalize
  return phone.trim() || null;
}

/**
 * Parse competencies from a string (comma or semicolon separated)
 */
export function parseCompetencies(value: string): string[] {
  if (!value) return [];
  
  return value
    .split(/[,;]/)
    .map(c => c.trim().toLowerCase())
    .filter(c => c.length > 0);
}

/**
 * Process a single row and convert to ParsedShiftRow
 */
function processRow(
  rawRow: Record<string, any>,
  mappedRow: Record<string, any>,
  rowNumber: number
): ParsedShiftRow {
  const warnings: ParsingWarning[] = [];
  const validationErrors: string[] = [];
  
  // Parse date
  const shiftDate = parseDate(mappedRow.shiftDate);
  if (mappedRow.shiftDate && !shiftDate) {
    warnings.push({
      field: 'shiftDate',
      issue: 'Could not parse date format',
      originalValue: mappedRow.shiftDate
    });
  }
  
  // Parse start time
  const shiftStartTime = parseTime(mappedRow.shiftStart);
  if (mappedRow.shiftStart && !shiftStartTime) {
    warnings.push({
      field: 'shiftStart',
      issue: 'Could not parse time format',
      originalValue: mappedRow.shiftStart
    });
  }
  
  // Parse end time
  const shiftEndTime = parseTime(mappedRow.shiftEnd);
  if (mappedRow.shiftEnd && !shiftEndTime) {
    warnings.push({
      field: 'shiftEnd',
      issue: 'Could not parse time format',
      originalValue: mappedRow.shiftEnd
    });
  }
  
  // Normalize phone numbers
  const workerPhone = normalizePhone(mappedRow.workerPhone);
  const participantPhone = normalizePhone(mappedRow.participantPhone);
  
  // Parse competencies
  const requiredCompetencies = parseCompetencies(mappedRow.requiredCompetencies);
  
  // Parse billing rate
  let billingRate: number | undefined;
  if (mappedRow.billingRate) {
    const parsed = parseFloat(mappedRow.billingRate.toString().replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      billingRate = parsed;
    }
  }
  
  // Validate required fields
  if (!shiftDate) {
    validationErrors.push('Missing or invalid shift date');
  }
  if (!shiftStartTime) {
    validationErrors.push('Missing or invalid start time');
  }
  if (!mappedRow.workerName?.trim()) {
    validationErrors.push('Missing worker name');
  }
  if (!mappedRow.participantName?.trim()) {
    validationErrors.push('Missing participant name');
  }
  
  // Calculate confidence score based on warnings and missing optional fields
  let confidenceScore = 1.0;
  confidenceScore -= warnings.length * 0.1;
  confidenceScore -= validationErrors.length * 0.2;
  if (!workerPhone) confidenceScore -= 0.05;
  if (!mappedRow.locationAddress) confidenceScore -= 0.05;
  confidenceScore = Math.max(0, Math.min(1, confidenceScore));
  
  return {
    rowNumber,
    shiftDate: shiftDate || undefined,
    shiftStartTime: shiftStartTime || undefined,
    shiftEndTime: shiftEndTime || undefined,
    workerName: mappedRow.workerName?.trim(),
    workerPhone: workerPhone || undefined,
    workerEmail: mappedRow.workerEmail?.trim()?.toLowerCase(),
    workerExternalId: mappedRow.workerExternalId?.trim(),
    participantName: mappedRow.participantName?.trim(),
    participantPhone: participantPhone || undefined,
    participantNdis: mappedRow.participantNdis?.trim(),
    participantExternalId: mappedRow.participantExternalId?.trim(),
    locationName: mappedRow.locationName?.trim(),
    locationAddress: mappedRow.locationAddress?.trim(),
    locationPostcode: mappedRow.locationPostcode?.trim(),
    shiftType: mappedRow.shiftType?.trim()?.toLowerCase(),
    supportCategory: mappedRow.supportCategory?.trim(),
    notes: mappedRow.notes?.trim(),
    requiredCompetencies,
    billingRate,
    rawData: rawRow,
    parsingWarnings: warnings,
    isValid: validationErrors.length === 0,
    validationErrors
  };
}

/**
 * Main roster parsing function
 * @param buffer - File buffer
 * @param fileType - Type of file (csv, excel, etc.)
 * @returns Parsed roster result
 */
export function parseRoster(
  buffer: Buffer,
  fileType: RosterFileType
): RosterParseResult {
  const errors: RosterParseResult['errors'] = [];
  const parsedShifts: ParsedShiftRow[] = [];
  
  let rawData: Record<string, any>[];
  
  try {
    // Parse based on file type
    if (fileType === RosterFileType.CSV) {
      rawData = parseCSV(buffer);
    } else if (fileType === RosterFileType.EXCEL) {
      rawData = parseExcel(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}. PDF and image parsing require OCR integration.`);
    }
    
    if (rawData.length === 0) {
      return {
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        parsedShifts: [],
        errors: [{ errorType: 'empty_file', errorMessage: 'File contains no data rows' }]
      };
    }
    
    // Get column headers from first row
    const columns = Object.keys(rawData[0]);
    
    // Create column mapping
    const mapping = createColumnMapping(columns);
    
    // Log mapping summary
    const mappingSummary = getMappingSummary(columns, mapping);
    logger.info('Column mapping summary:', {
      coverage: `${mappingSummary.coverage.toFixed(1)}%`,
      mapped: mappingSummary.mapped.length,
      unmapped: mappingSummary.unmapped
    });
    
    // Validate required fields are present
    const validation = validateMapping(mapping, REQUIRED_SHIFT_FIELDS);
    if (!validation.isValid) {
      logger.warn('Missing required columns:', validation.missingFields);
      // Continue anyway - we'll report errors for individual rows
    }
    
    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const rawRow = rawData[i];
      const rowNumber = i + 2; // +2 for header row and 1-based indexing
      
      try {
        // Skip empty rows
        const values = Object.values(rawRow);
        if (values.every(v => !v || v.toString().trim() === '')) {
          continue;
        }
        
        // Apply column mapping
        const mappedRow = applyMapping(rawRow, mapping);
        
        // Process the row
        const parsedRow = processRow(rawRow, mappedRow, rowNumber);
        parsedShifts.push(parsedRow);
        
        // Log validation errors
        if (!parsedRow.isValid) {
          for (const error of parsedRow.validationErrors) {
            errors.push({
              rowNumber,
              errorType: 'validation_error',
              errorMessage: error
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          rowNumber,
          errorType: 'processing_error',
          errorMessage
        });
        logger.error(`Error processing row ${rowNumber}:`, error);
      }
    }
    
    const successfulRows = parsedShifts.filter(s => s.isValid).length;
    const failedRows = parsedShifts.filter(s => !s.isValid).length;
    
    return {
      totalRows: rawData.length,
      successfulRows,
      failedRows,
      parsedShifts,
      errors
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    logger.error('Roster parsing failed:', error);
    
    return {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      parsedShifts: [],
      errors: [{
        errorType: 'file_parsing_error',
        errorMessage
      }]
    };
  }
}

/**
 * Validate a roster file before full parsing
 * Quick check for file type and basic structure
 */
export function validateRosterFile(
  buffer: Buffer,
  filename: string,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): { isValid: boolean; error?: string; fileType?: RosterFileType } {
  // Check file size
  if (buffer.length > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed (${Math.round(maxSizeBytes / 1024 / 1024)}MB)`
    };
  }
  
  // Determine file type
  const fileType = determineFileType(filename);
  
  // Validate file type is supported
  if (fileType === RosterFileType.PDF || fileType === RosterFileType.IMAGE) {
    return {
      isValid: false,
      error: 'PDF and image files are not yet supported. Please upload CSV or Excel files.',
      fileType
    };
  }
  
  // Quick structure validation
  try {
    let rowCount = 0;
    
    if (fileType === RosterFileType.CSV) {
      const csvString = buffer.toString('utf-8');
      const lines = csvString.split('\n').filter(l => l.trim());
      rowCount = lines.length - 1; // Exclude header
    } else if (fileType === RosterFileType.EXCEL) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      rowCount = range.e.r; // End row (0-indexed)
    }
    
    if (rowCount === 0) {
      return {
        isValid: false,
        error: 'File appears to be empty or contains only a header row',
        fileType
      };
    }
    
    return { isValid: true, fileType };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'File could not be read. Please ensure it is a valid CSV or Excel file.',
      fileType
    };
  }
}

