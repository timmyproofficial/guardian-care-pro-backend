/**
 * Batch Invoice template generator
 * Creates HTML for batch invoice PDFs
 */

import moment from 'moment';
// import config from '../config/env';

/**
 * Interface for batch invoice template data
 */
interface BatchInvoiceTemplateData {
  invoiceNumber: string;
  batchNumber: string;
  dateRange: {
    start: string;
    end: string;
  };
  worker: {
    name: string;
    email: string;
    phone: string;
    abn?: string;
    bankDetails?: {
      accountName: string;
      bsb: string;
      accountNumber: string;
    };
  };
  participant: {
    name: string;
    email: string;
    phone: string;
    ndisNumber?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  timesheets: {
    date: string;
    startTime: string;
    endTime: string;
    hours: string;
    serviceType: string;
    rateItems: {
      name: string;
      code: string;
      hourlyRate: number;
      hours: number;
      amount: number;
    }[];
    travel: {
      km: number;
      rate: number;
      amount: number;
    };
    expenses: {
      title: string;
      description: string;
      amount: number;
      receiptUrl?: string;
    }[];
    subtotal: number;
  }[];
  totals: {
    subtotal: number;
    travelExpenseTotal: number;
    invoiceTotal: number;
    additionalExpensesTotal: number;
  };
}

/**
 * Generate batch invoice HTML
 * This template can be used to generate PDF invoices using a library like html-pdf or puppeteer
 */
export const generateBatchInvoiceHtml = (data: BatchInvoiceTemplateData): string => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    });
  };
  
  // Generate timesheet rows
  const timesheetRows = data.timesheets.map(ts => {
    // Calculate total for this timesheet (services + travel, NOT expenses)
    const timesheetTotal = ts.subtotal + ts.travel.amount;
    
    return `
      <tr class="timesheet-row">
        <td>${ts.date}</td>
        <td>${ts.startTime} - ${ts.endTime}</td>
        <td>${ts.hours}</td>
        <td>${ts.serviceType}</td>
        <td>${formatCurrency(timesheetTotal)}</td>
      </tr>
      ${ts.rateItems.map(item => `
        <tr class="rate-item-row">
          <td colspan="2" class="indent">${item.name} (${item.code})</td>
          <td>${item.hours.toFixed(2)}</td>
          <td>${formatCurrency(item.hourlyRate)}/hr</td>
          <td>${formatCurrency(item.amount)}</td>
        </tr>
      `).join('')}
      ${ts.travel.km > 0 ? `
        <tr class="travel-row">
          <td colspan="2" class="indent">Travel Distance</td>
          <td>${ts.travel.km.toFixed(2)} km</td>
          <td>${formatCurrency(ts.travel.rate)}/km</td>
          <td>${formatCurrency(ts.travel.amount)}</td>
        </tr>
      ` : ''}
      ${ts.expenses.length > 0 ? `
        <tr class="expense-header">
          <td colspan="5" class="expense-note">Additional Expenses (Not Included in Total):</td>
        </tr>
        ${ts.expenses.map(exp => `
          <tr class="expense-row">
            <td colspan="2" class="indent">${exp.title}</td>
            <td colspan="2">${exp.description}</td>
            <td>${formatCurrency(exp.amount)}</td>
          </tr>
        `).join('')}
      ` : ''}
      <tr class="timesheet-divider">
        <td colspan="5"></td>
      </tr>
    `;
  }).join('');
  
  // Complete HTML template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Batch Invoice ${data.invoiceNumber}</title>
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
        .invoice-subtitle {
          font-size: 16px;
          margin-bottom: 10px;
          color: #7f8c8d;
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
        .timesheet-row td {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        .rate-item-row td, .travel-row td, .expense-row td {
          border-bottom: none;
        }
        .indent {
          padding-left: 30px;
        }
        .timesheet-divider td {
          border-bottom: 1px solid #2c3e50;
          padding: 5px;
        }
        .expense-header td {
          font-style: italic;
          color: #7f8c8d;
          border-bottom: none;
        }
        .expense-note {
          font-weight: bold;
          color: #e74c3c;
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
        .expenses-total-row {
          color: #e74c3c;
          font-style: italic;
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
        .period-note {
          font-style: italic;
          color: #7f8c8d;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">CONSOLIDATED INVOICE</div>
            <div class="invoice-subtitle">Weekly Service Summary</div>
            <div>Guardian Care Pro</div>
            <div>123 Support Street</div>
            <div>Sydney, NSW 2000</div>
            <div>ABN: 12 345 678 901</div>
            <div>Phone: (02) 1234 5678</div>
            <div>Email: billing@guardiancapro.com</div>
          </div>
          <div>
            <div><strong>Invoice #:</strong> ${data.invoiceNumber}</div>
            <div><strong>Batch #:</strong> ${data.batchNumber}</div>
            <div><strong>Date:</strong> ${moment().format('DD/MM/YYYY')}</div>
            <div><strong>Period:</strong> ${data.dateRange.start} - ${data.dateRange.end}</div>
          </div>
        </div>
        
        <div class="period-note">
          This is a consolidated invoice for services provided between ${data.dateRange.start} and ${data.dateRange.end}.
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <h3>Bill To:</h3>
            <div>${data.participant.name}</div>
            <div>Email: ${data.participant.email}</div>
            <div>Phone: ${data.participant.phone}</div>
            ${data.participant.ndisNumber ? `<div>NDIS #: ${data.participant.ndisNumber}</div>` : ''}
            ${data.participant.address ? `
              <div>${data.participant.address.street}</div>
              <div>${data.participant.address.city}, ${data.participant.address.state} ${data.participant.address.postalCode}</div>
              <div>${data.participant.address.country}</div>
            ` : ''}
          </div>
          
          <div class="invoice-details-col">
            <h3>From:</h3>
            <div>${data.worker.name}</div>
            <div>Email: ${data.worker.email}</div>
            <div>Phone: ${data.worker.phone}</div>
            ${data.worker.abn ? `<div>ABN: ${data.worker.abn}</div>` : ''}
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Hours</th>
              <th>Service/Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${timesheetRows}
          </tbody>
        </table>
        
        <table class="invoice-totals">
          <tr>
            <th>Subtotal (Services):</th>
            <td>${formatCurrency(data.totals.subtotal)}</td>
          </tr>
          <tr>
            <th>Travel Expenses:</th>
            <td>${formatCurrency(data.totals.travelExpenseTotal)}</td>
          </tr>
          <tr class="total-row">
            <th>Total:</th>
            <td>${formatCurrency(data.totals.invoiceTotal)}</td>
          </tr>
          ${data.totals.additionalExpensesTotal > 0 ? `
          <tr class="expenses-total-row">
            <th>Additional Expenses (Not Included in Total):</th>
            <td>${formatCurrency(data.totals.additionalExpensesTotal)}</td>
          </tr>
          ` : ''}
        </table>
        
        ${data.worker.bankDetails ? `
        <div class="payment-details">
          <h3>Payment Details:</h3>
          <div>Account Name: ${data.worker.bankDetails.accountName}</div>
          <div>BSB: ${data.worker.bankDetails.bsb}</div>
          <div>Account Number: ${data.worker.bankDetails.accountNumber}</div>
          <div>Please include the invoice number ${data.invoiceNumber} as reference</div>
        </div>
        ` : ''}
        
        <div class="invoice-footer">
          <p>This consolidated invoice includes multiple service periods. See line items for details.</p>
          <p>Additional expenses are listed for reference only and are not included in the invoice total.</p>
          <p>Thank you for your business. If you have any questions about this invoice, please contact us.</p>
          <p>&copy; ${new Date().getFullYear()} Guardian Care Pro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};