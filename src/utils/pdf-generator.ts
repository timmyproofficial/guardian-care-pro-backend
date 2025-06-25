/**
 * PDF generator utility
 * Converts HTML templates to PDFs for invoices, reports, etc.
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { generateInvoiceHtml } from '../templates/invoice.template';
import { generateBatchInvoiceHtml } from '@/templates/batchInvoice.template';
import { IInvoice } from '../models/invoice.model';
import logger from './logger';
// import config from '../config/env';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads/invoices');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generate PDF from HTML
 * @param html - HTML content to convert to PDF
 * @param options - PDF options
 * @returns Path to the generated PDF file
 */
export const generatePdf = async (
  html: string,
  filename: string,
  options = {}
): Promise<string> => {
  try {
    // Launch puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      ...options
    });
    
    // Close browser
    await browser.close();
    
    // Save PDF to file
    const pdfPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    return pdfPath;
  } catch (error) {
    logger.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate invoice PDF
 * @param invoice - Invoice data to generate PDF for
 * @returns Path to the generated invoice PDF
 */
export const generateInvoicePdf = async (invoice: IInvoice): Promise<string> => {
  try {
    // Generate HTML from template
    const html = generateInvoiceHtml(invoice);
    
    // Generate filename
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    
    // Generate PDF
    const pdfPath = await generatePdf(html, filename);
    
    return pdfPath;
  } catch (error) {
    logger.error(`Error generating invoice PDF for ${invoice.invoiceNumber}:`, error);
    throw error;
  }
};

/**
 * Generate batch invoice PDF
 * @param templateData - Data for the batch invoice template
 * @param filename - Name to save the file as
 * @returns Path to the generated PDF file
 */
export const generateBatchInvoicePdf = async (
  templateData: any,
  filename: string
): Promise<string> => {
  try {
    // Generate HTML from batch invoice template
    const html = generateBatchInvoiceHtml(templateData);
    
    // Generate PDF
    const pdfPath = await generatePdf(html, filename, {
      // Optionally add special options for batch invoices
      format: 'A4',
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      headerTemplate: '',
      footerTemplate: '',
      displayHeaderFooter: false,
      printBackground: true
    });
    
    return pdfPath;
  } catch (error) {
    logger.error(`Error generating batch invoice PDF for ${filename}:`, error);
    throw error;
  }
};