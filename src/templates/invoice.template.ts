/**
 * Invoice template generator
 * Creates HTML for invoice PDFs
 */

import { IInvoice } from '../models/invoice.model';
import moment from 'moment';
// import config from '../config/env';

/**
 * Generate invoice HTML
 * This template can be used to generate PDF invoices using a library like html-pdf or puppeteer
 */
export const generateInvoiceHtml = (invoice: IInvoice): string => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    });
  };
  
  // Format date
  const formatDate = (date: Date): string => {
    return moment(date).format('DD/MM/YYYY');
  };
  
  // Generate work items table rows
  const workItemsHtml = invoice.workItems.map(item => `
    <tr>
      <td>${item.description}</td>
      <td>${item.rateTimeBandName} (${item.rateTimeBandCode})</td>
      <td>${formatCurrency(item.hourlyRate)}</td>
      <td>${item.hours.toFixed(2)}</td>
      <td>${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');
  
  // Generate travel expense row if applicable
  const travelExpenseHtml = invoice.travelExpense ? `
    <tr>
      <td>Travel Distance</td>
      <td></td>
      <td>${formatCurrency(invoice.travelExpense.distanceTravelRate)}/km</td>
      <td>${invoice.travelExpense.distanceTravelKm.toFixed(2)} km</td>
      <td>${formatCurrency(invoice.travelExpense.distanceTravelAmount)}</td>
    </tr>
  ` : '';
  
  // Generate additional expenses rows if any
//   const expensesHtml = invoice.expenses.length > 0 ? invoice.expenses.map(expense => `
//     <tr>
//       <td>${expense.title}</td>
//       <td colspan="3">${expense.description}</td>
//       <td>${formatCurrency(expense.amount)}</td>
//     </tr>
//   `).join('') : '';
  
  // Complete HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          font-size: 13px;
          line-height: 1.6;
          background: #ffffff;
        }
        .invoice-container {
          width: 100%;
          max-width: 750px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 25px;
        }
        .logo {
          max-width: 200px;
        }
        .invoice-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #1f2937;
          letter-spacing: -0.5px;
        }
        .company-info {
          font-size: 13px;
          line-height: 1.4;
          color: #6b7280;
        }
        .invoice-meta {
          text-align: right;
          font-size: 13px;
          color: #374151;
        }
        .invoice-meta div {
          margin-bottom: 5px;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 35px;
          gap: 30px;
        }
        .invoice-details-col {
          flex: 1;
          min-width: 0;
        }
        .invoice-details-col h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .invoice-details-col div {
          margin-bottom: 4px;
          font-size: 13px;
          color: #374151;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }
        .invoice-table th, .invoice-table td {
          padding: 12px 8px;
          text-align: left;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }
        .invoice-table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .invoice-table td {
          word-wrap: break-word;
          max-width: 0;
        }
        .invoice-table tr:last-child td {
          border-bottom: none;
        }
        .invoice-table tr:hover {
          background-color: #fafafa;
        }
        .description-col {
          width: 35%;
        }
        .rate-type-col {
          width: 20%;
        }
        .rate-col, .quantity-col, .amount-col {
          width: 15%;
          text-align: right;
        }
        .invoice-totals {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          max-width: 300px;
          margin-left: auto;
        }
        .invoice-totals th, .invoice-totals td {
          padding: 10px 12px;
          text-align: right;
          border: none;
          font-size: 13px;
        }
        .invoice-totals th {
          font-weight: 500;
          color: #6b7280;
        }
        .invoice-totals .total-row {
          font-weight: 600;
          font-size: 16px;
          border-top: 2px solid #1f2937;
          background-color: #f9fafb;
        }
        .invoice-totals .total-row th,
        .invoice-totals .total-row td {
          color: #1f2937;
          padding: 15px 12px;
        }
        .invoice-footer {
          margin-top: 40px;
          border-top: 1px solid #e5e7eb;
          padding-top: 25px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
        }
        .payment-details {
          margin-top: 30px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .payment-details h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #1f2937;
          font-weight: 600;
          font-size: 15px;
        }
        .payment-details div {
          margin-bottom: 5px;
          font-size: 13px;
          color: #374151;
        }
        .notes {
          margin-bottom: 25px;
          padding: 15px;
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }
        .notes h3 {
          margin-top: 0;
          margin-bottom: 8px;
          color: #92400e;
          font-size: 14px;
          font-weight: 600;
        }
        .notes p {
          margin: 0;
          color: #92400e;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="company-info">
              <div>Guardian Care Pro</div>
              <div>123 Support Street</div>
              <div>Sydney, NSW 2000</div>
              <div>ABN: 12 345 678 901</div>
              <div>Phone: (02) 1234 5678</div>
              <div>Email: billing@example.com</div>
            </div>
          </div>
          <div class="invoice-meta">
            <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
            <div><strong>Due Date:</strong> ${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</div>
          </div>
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <h3>Bill To:</h3>
            <div><strong>${invoice.participantDetails.name}</strong></div>
            <div>Email: ${invoice.participantDetails.email}</div>
            <div>Phone: ${invoice.participantDetails.phone}</div>
            ${invoice.participantDetails.ndisNumber ? `<div>NDIS #: ${invoice.participantDetails.ndisNumber}</div>` : ''}
            ${invoice.participantDetails.address ? `
              <div>${invoice.participantDetails.address.street}</div>
              <div>${invoice.participantDetails.address.city}, ${invoice.participantDetails.address.state} ${invoice.participantDetails.address.postalCode}</div>
              <div>${invoice.participantDetails.address.country}</div>
            ` : ''}
          </div>
          
          <div class="invoice-details-col">
            <h3>From:</h3>
            <div><strong>${invoice.workerDetails.name}</strong></div>
            <div>Email: ${invoice.workerDetails.email}</div>
            <div>Phone: ${invoice.workerDetails.phone}</div>
            ${invoice.workerDetails.abn ? `<div>ABN: ${invoice.workerDetails.abn}</div>` : ''}
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th class="description-col">Description</th>
              <th class="rate-type-col">Rate Type</th>
              <th class="rate-col">Rate</th>
              <th class="quantity-col">Hours</th>
              <th class="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${workItemsHtml}
            ${travelExpenseHtml}
          </tbody>
        </table>
        
        <table class="invoice-totals">
          <tr>
            <th>Subtotal:</th>
            <td>${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr class="total-row">
            <th>Total:</th>
            <td>${formatCurrency(invoice.totalAmount)}</td>
          </tr>
        </table>
        
        ${invoice.notes ? `
        <div class="notes">
          <h3>Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
        ` : ''}
        
        <div class="payment-details">
          <h3>Payment Details:</h3>
          <div><strong>Account Name:</strong> ${invoice?.workerDetails?.bankDetails?.accountName ?? 'N/A'}</div>
          <div><strong>BSB:</strong> ${invoice?.workerDetails?.bankDetails?.bsb ?? 'N/A'}</div>
          <div><strong>Account Number:</strong> ${invoice?.workerDetails?.bankDetails?.accountNumber ?? 'N/A'}</div>
          <div>Please include the invoice number <strong>${invoice.invoiceNumber}</strong> as reference</div>
        </div>
        
        <div class="invoice-footer">
          <p>Thank you for your business. If you have any questions about this invoice, please contact us.</p>
          <p>&copy; ${new Date().getFullYear()} Guardian Care Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};