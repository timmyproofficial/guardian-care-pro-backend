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
          margin-bottom: 8px;
          color: #1f2937;
          letter-spacing: -0.5px;
        }
        .invoice-subtitle {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 12px;
          color: #6b7280;
          font-style: italic;
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
        .timesheet-row td {
          background-color: #fef3c7;
          font-weight: 600;
          color: #92400e;
          border-bottom: 1px solid #fbbf24;
        }
        .rate-item-row td, .travel-row td, .expense-row td {
          border-bottom: none;
          background-color: #fefffe;
        }
        .indent {
          padding-left: 25px;
          font-style: italic;
          color: #6b7280;
        }
        .timesheet-divider td {
          border-bottom: 2px solid #d1d5db;
          padding: 8px;
          background-color: transparent;
        }
        .expense-header td {
          font-style: italic;
          color: #7f8c8d;
          border-bottom: none;
          background-color: #fef2f2;
        }
        .expense-note {
          font-weight: 600;
          color: #dc2626;
        }
        .invoice-totals {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          max-width: 350px;
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
        .expenses-total-row {
          color: #dc2626;
          font-style: italic;
          background-color: #fef2f2;
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
        .period-note {
          font-style: italic;
          color: #6b7280;
          margin-bottom: 25px;
          padding: 15px;
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">CONSOLIDATED INVOICE</div>
            <div class="invoice-subtitle">Weekly Service Summary</div>
            <div class="company-info">
              <div>Support24</div>
              <div>123 Support Street</div>
              <div>Sydney, NSW 2000</div>
              <div>ABN: 12 345 678 901</div>
              <div>Phone: (02) 1234 5678</div>
              <div>Email: billing@guardiancapro.com</div>
            </div>
          </div>
          <div class="invoice-meta">
            <div><strong>Invoice #:</strong> ${data.invoiceNumber}</div>
            <div><strong>Batch #:</strong> ${data.batchNumber}</div>
            <div><strong>Date:</strong> ${moment().format('DD/MM/YYYY')}</div>
            <div><strong>Period:</strong> ${data.dateRange.start} - ${data.dateRange.end}</div>
          </div>
        </div>
        
        <div class="period-note">
          This is a consolidated invoice for services provided between <strong>${data.dateRange.start}</strong> and <strong>${data.dateRange.end}</strong>.
        </div>
        
        <div class="invoice-details">
          <div class="invoice-details-col">
            <h3>Bill To:</h3>
            <div><strong>${data.participant.name}</strong></div>
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
            <div><strong>${data.worker.name}</strong></div>
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
          <div><strong>Account Name:</strong> ${data.worker.bankDetails.accountName}</div>
          <div><strong>BSB:</strong> ${data.worker.bankDetails.bsb}</div>
          <div><strong>Account Number:</strong> ${data.worker.bankDetails.accountNumber}</div>
          <div>Please include the invoice number <strong>${data.invoiceNumber}</strong> as reference</div>
        </div>
        ` : ''}
        
        <div class="invoice-footer">
          <p>This consolidated invoice includes multiple service periods. See line items for details.</p>
          <p><strong>Note:</strong> Additional expenses are listed for reference only and are not included in the invoice total.</p>
          <p>Thank you for your business. If you have any questions about this invoice, please contact us.</p>
          <p>&copy; ${new Date().getFullYear()} Support24. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};