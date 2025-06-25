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
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          font-size: 12px;
        }
        .invoice-container {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 20px;
        }
        .logo {
          max-width: 200px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #2c3e50;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .invoice-details-col {
          flex: 1;
        }
        .invoice-details-col h3 {
          font-size: 16px;
          margin-bottom: 10px;
          color: #2c3e50;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .invoice-table th, .invoice-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .invoice-table th {
          background-color: #f8f9fa;
          font-weight: bold;
          color: #2c3e50;
        }
        .invoice-table tr:last-child td {
          border-bottom: none;
        }
        .invoice-totals {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .invoice-totals th, .invoice-totals td {
          padding: 10px;
          text-align: right;
          border: none;
        }
        .invoice-totals .total-row {
          font-weight: bold;
          font-size: 16px;
          border-top: 2px solid #333;
        }
        .invoice-footer {
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        }
        .payment-details {
          margin-top: 30px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
        }
        .payment-details h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #2c3e50;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">INVOICE</div>
            <div>Guardian Care Pro</div>
            <div>123 Support Street</div>
            <div>Sydney, NSW 2000</div>
            <div>ABN: 12 345 678 901</div>
            <div>Phone: (02) 1234 5678</div>
            <div>Email: billing@guardiancapro.com</div>
          </div>
          <div>
            <div class="invoice-number">Invoice #: ${invoice.invoiceNumber}</div>
            <div>Date: ${formatDate(invoice.invoiceDate)}</div>
            <div>Due Date: ${invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</div>
          </div>
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <h3>Bill To:</h3>
            <div>${invoice.participantDetails.name}</div>
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
            <div>${invoice.workerDetails.name}</div>
            <div>Email: ${invoice.workerDetails.email}</div>
            <div>Phone: ${invoice.workerDetails.phone}</div>
            ${invoice.workerDetails.abn ? `<div>ABN: ${invoice.workerDetails.abn}</div>` : ''}
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Rate Type</th>
              <th>Rate</th>
              <th>Quantity</th>
              <th>Amount</th>
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
          <div>Account Name: ${invoice?.workerDetails?.bankDetails?.accountName ?? ''}</div>
          <div>BSB: ${invoice?.workerDetails?.bankDetails?.bsb ?? ''}</div>
          <div>Account Number: ${invoice?.workerDetails?.bankDetails?.accountNumber ?? ''}</div>
          <div>Please include the invoice number ${invoice.invoiceNumber} as reference</div>
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