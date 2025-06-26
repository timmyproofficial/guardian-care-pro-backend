/**
 * Email service
 * Handles sending email notifications to users
 */

import nodemailer from 'nodemailer';
import config from '../config/env';
import logger from '../utils/logger';

/**
 * Email transport configuration
 */
const transport = nodemailer.createTransport(config.email.smtp);

/**
 * Verify transport connection
 */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch((error) =>
      logger.warn(
        'Unable to connect to email server. Make sure you have configured the SMTP options:',
        error
      )
    );
}

/**
 * Email service implementation
 */
export const emailService = {
  /**
   * Send an email
   */
  sendEmail: async (
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<void> => {
    try {
      const msg = {
        from: config.email.from,
        to,
        subject,
        text,
        html: html || text,
      };
      await transport.sendMail(msg);
      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  },
  
  /**
   * Send verification OTP code
   */
  sendVerificationOTP: async (
    to: string,
    name: string,
    otpCode: string
  ): Promise<void> => {
    const subject = 'Email Verification Code - Guardian Care Pro';
    const text = `
      Hello ${name},
      
      Your verification code for Guardian Care Pro is: ${otpCode}
      
      This code will expire in 10 minutes.
      
      If you did not create an account with us, please ignore this email.
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Guardian Care Pro!</h2>
        <p>Hello ${name},</p>
        <p>Your verification code for Guardian Care Pro is:</p>
        <div style="background-color: #f5f5f5; padding: 12px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 4px;">
          ${otpCode}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not create an account with us, please ignore this email.</p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send password reset OTP code
   */
  sendPasswordResetOTP: async (
    to: string,
    name: string,
    otpCode: string
  ): Promise<void> => {
    const subject = 'Password Reset Code - Guardian Care Pro';
    const text = `
      Hello ${name},
      
      You requested to reset your password. Your password reset code is: ${otpCode}
      
      This code will expire in 10 minutes.
      
      If you didn't request this, please ignore this email and your password will remain unchanged.
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Your password reset code is:</p>
        <div style="background-color: #f5f5f5; padding: 12px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 4px;">
          ${otpCode}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send new shift booking notification
   */
  sendShiftBookingEmail: async (
    to: string,
    name: string,
    shiftDetails: {
      date: string;
      startTime: string;
      endTime: string;
      participantName?: string;
      workerName?: string;
      serviceType: string;
      location: string;
    }
  ): Promise<void> => {
    const subject = 'New Shift Booking - Guardian Care Pro';
    
    // Customize message based on whether it's for a worker or participant
    const recipientDetails = shiftDetails.participantName
      ? `for ${shiftDetails.participantName}`
      : `with ${shiftDetails.workerName}`;
    
    const text = `
      Hello ${name},
      
      A new shift has been booked ${recipientDetails}:
      
      Date: ${shiftDetails.date}
      Time: ${shiftDetails.startTime} - ${shiftDetails.endTime}
      Service: ${shiftDetails.serviceType}
      Location: ${shiftDetails.location}
      
      You can view the details and manage this booking in your Guardian Care Pro dashboard.
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Shift Booking</h2>
        <p>Hello ${name},</p>
        <p>A new shift has been booked ${recipientDetails}:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Date:</strong> ${shiftDetails.date}</p>
          <p><strong>Time:</strong> ${shiftDetails.startTime} - ${shiftDetails.endTime}</p>
          <p><strong>Service:</strong> ${shiftDetails.serviceType}</p>
          <p><strong>Location:</strong> ${shiftDetails.location}</p>
        </div>
        <p>You can <a href="${config.clientUrl}/dashboard">view the details and manage this booking</a> in your Guardian Care Pro dashboard.</p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send timesheet approval notification
   */
  sendTimesheetApprovalEmail: async (
    to: string,
    name: string,
    timesheetDetails: {
      date: string;
      participantName: string;
      workerName: string;
      hours: number;
      status: string;
    }
  ): Promise<void> => {
    const subject = 'Timesheet Update - Guardian Care Pro';
    
    const text = `
      Hello ${name},
      
      The timesheet for ${timesheetDetails.date} with ${timesheetDetails.participantName} has been ${timesheetDetails.status}.
      
      Details:
      Worker: ${timesheetDetails.workerName}
      Date: ${timesheetDetails.date}
      Hours: ${timesheetDetails.hours}
      Status: ${timesheetDetails.status}
      
      You can view all timesheet details in your Guardian Care Pro dashboard.
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Timesheet Update</h2>
        <p>Hello ${name},</p>
        <p>The timesheet for ${timesheetDetails.date} with ${timesheetDetails.participantName} has been <strong>${timesheetDetails.status}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Worker:</strong> ${timesheetDetails.workerName}</p>
          <p><strong>Date:</strong> ${timesheetDetails.date}</p>
          <p><strong>Hours:</strong> ${timesheetDetails.hours}</p>
          <p><strong>Status:</strong> ${timesheetDetails.status}</p>
        </div>
        <p>You can <a href="${config.clientUrl}/dashboard/timesheets">view all timesheet details</a> in your Guardian Care Pro dashboard.</p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send document verification notification
   */
  sendDocumentVerificationEmail: async (
    to: string,
    name: string,
    documentDetails: {
      documentType: string;
      status: string;
      notes?: string;
    }
  ): Promise<void> => {
    const subject = 'Document Verification Update - Guardian Care Pro';
    
    const text = `
      Hello ${name},
      
      The status of your ${documentDetails.documentType} document has been updated to ${documentDetails.status}.
      
      ${documentDetails.notes ? `Notes: ${documentDetails.notes}` : ''}
      
      ${
        documentDetails.status === 'rejected'
          ? 'Please log in to your account to update the document.'
          : 'You can view the details in your account.'
      }
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Document Verification Update</h2>
        <p>Hello ${name},</p>
        <p>The status of your <strong>${documentDetails.documentType}</strong> document has been updated to <strong style="color: ${
      documentDetails.status === 'approved' ? 'green' : documentDetails.status === 'rejected' ? 'red' : 'orange'
    };">${documentDetails.status}</strong>.</p>
        ${documentDetails.notes ? `<p><strong>Notes:</strong> ${documentDetails.notes}</p>` : ''}
        <p>${
          documentDetails.status === 'rejected'
            ? '<a href="' + config.clientUrl + '/dashboard/documents">Please log in to your account</a> to update the document.'
            : 'You can <a href="' + config.clientUrl + '/dashboard/documents">view the details in your account</a>.'
        }</p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send subscription confirmation email
   */
  sendSubscriptionConfirmationEmail: async (
    to: string,
    name: string,
    subscriptionDetails: {
      tier: string;
      startDate: string;
      amount: string;
      renewalDate: string;
    }
  ): Promise<void> => {
    const subject = 'Subscription Confirmation - Guardian Care Pro';
    
    const text = `
      Hello ${name},
      
      Thank you for subscribing to Guardian Care Pro. Your subscription has been confirmed.
      
      Subscription Details:
      Tier: ${subscriptionDetails.tier}
      Start Date: ${subscriptionDetails.startDate}
      Amount: ${subscriptionDetails.amount}
      Next Renewal: ${subscriptionDetails.renewalDate}
      
      You can manage your subscription from your account settings.
      
      Thank you for choosing Guardian Care Pro,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Subscription Confirmation</h2>
        <p>Hello ${name},</p>
        <p>Thank you for subscribing to Guardian Care Pro. Your subscription has been confirmed.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Tier:</strong> ${subscriptionDetails.tier}</p>
          <p><strong>Start Date:</strong> ${subscriptionDetails.startDate}</p>
          <p><strong>Amount:</strong> ${subscriptionDetails.amount}</p>
          <p><strong>Next Renewal:</strong> ${subscriptionDetails.renewalDate}</p>
        </div>
        <p>You can <a href="${config.clientUrl}/settings/subscription">manage your subscription</a> from your account settings.</p>
        <p>Thank you for choosing Guardian Care Pro,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },
  
  /**
   * Send document expiry reminder
   */
  sendDocumentExpiryReminderEmail: async (
    to: string,
    name: string,
    documentDetails: {
      documentType: string;
      expiryDate: string;
      daysRemaining: number;
    }
  ): Promise<void> => {
    const subject = 'Document Expiry Reminder - Guardian Care Pro';
    
    const text = `
      Hello ${name},
      
      This is a reminder that your ${documentDetails.documentType} is expiring soon on ${documentDetails.expiryDate} (${documentDetails.daysRemaining} days remaining).
      
      Please update your document before it expires to ensure continued access to the platform.
      
      You can upload a new document from your account dashboard.
      
      Thank you,
      Guardian Care Pro Team
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Document Expiry Reminder</h2>
        <p>Hello ${name},</p>
        <p>This is a reminder that your <strong>${documentDetails.documentType}</strong> is expiring soon on <strong>${documentDetails.expiryDate}</strong> (${documentDetails.daysRemaining} days remaining).</p>
        <p>Please update your document before it expires to ensure continued access to the platform.</p>
        <p><a href="${config.clientUrl}/dashboard/documents" style="display: inline-block; background-color: #4285F4; color: white; padding: 10px 20px; text-align: center; text-decoration: none; border-radius: 4px;">Upload New Document</a></p>
        <p>Thank you,<br>Guardian Care Pro Team</p>
      </div>
    `;
    
    await emailService.sendEmail(to, subject, text, html);
  },

/**
 * Send invoice email
 */
sendInvoiceEmail: async (
  to: string,
  name: string,
  invoiceDetails: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    workerName: string;
    amount: string;
  }
): Promise<void> => {
  const subject = `Invoice ${invoiceDetails.invoiceNumber} - Guardian Care Pro`;
  
  const text = `
    Hello ${name},
    
    Please find your invoice ${invoiceDetails.invoiceNumber} from ${invoiceDetails.workerName}.
    
    Invoice Number: ${invoiceDetails.invoiceNumber}
    Date: ${invoiceDetails.invoiceDate}
    Due Date: ${invoiceDetails.dueDate}
    Amount: $${invoiceDetails.amount}
    
    You can view and download the invoice from your Guardian Care Pro dashboard.
    
    Thank you for using Guardian Care Pro,
    Guardian Care Pro Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Invoice from Guardian Care Pro</h2>
      <p>Hello ${name},</p>
      <p>Please find your invoice 
        <strong>${invoiceDetails.invoiceNumber}</strong> 
        from <strong>${invoiceDetails.workerName}</strong>.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceDetails.invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceDetails.invoiceDate}</p>
        <p><strong>Due Date:</strong> ${invoiceDetails.dueDate}</p>
        <p><strong>Amount:</strong> $${invoiceDetails.amount}</p>
      </div>
      <p>You can 
      <a href="${config.clientUrl}/dashboard/invoices">view and download the invoice</a> 
      from your Guardian Care Pro dashboard.</p>
      <p>Thank you for using Guardian Care Pro,<br>Guardian Care Pro Team</p>
    </div>
  `;
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send batch invoice email to participant
 */
sendBatchInvoiceEmail: async (
  to: string,
  name: string,
  invoiceDetails: {
    invoiceNumber: string;
    workerName: string;
    startDate: string;
    endDate: string;
    totalAmount: string;
    batchNumber: string;
  }
): Promise<void> => {
  const subject = `Invoice ${invoiceDetails.invoiceNumber} for period ${invoiceDetails.startDate} - ${invoiceDetails.endDate}`;
  
  const text = `
    Hello ${name},
    
    Please find your consolidated invoice ${invoiceDetails.invoiceNumber} from ${invoiceDetails.workerName} for services provided between ${invoiceDetails.startDate} and ${invoiceDetails.endDate}.
    
    Invoice Number: ${invoiceDetails.invoiceNumber}
    Batch Number: ${invoiceDetails.batchNumber}
    Period: ${invoiceDetails.startDate} to ${invoiceDetails.endDate}
    Total Amount: $${invoiceDetails.totalAmount}
    
    You can view and download the detailed invoice from your Guardian Care Pro dashboard.
    
    Thank you for using Guardian Care Pro,
    Guardian Care Pro Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Weekly Invoice Summary</h2>
      <p>Hello ${name},</p>
      <p>Please find your consolidated invoice <strong>${invoiceDetails.invoiceNumber}</strong> from <strong>${invoiceDetails.workerName}</strong> for services provided between <strong>${invoiceDetails.startDate}</strong> and <strong>${invoiceDetails.endDate}</strong>.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceDetails.invoiceNumber}</p>
        <p><strong>Batch Number:</strong> ${invoiceDetails.batchNumber}</p>
        <p><strong>Period:</strong> ${invoiceDetails.startDate} to ${invoiceDetails.endDate}</p>
        <p><strong>Total Amount:</strong> $${invoiceDetails.totalAmount}</p>
      </div>
      <p>You can <a href="${config.clientUrl}/dashboard/batch-invoices">view and download the detailed invoice</a> from your Guardian Care Pro dashboard.</p>
      <p>Thank you for using Guardian Care Pro,<br>Guardian Care Pro Team</p>
    </div>
  `;
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send batch invoice email to worker
 */
sendWorkerBatchInvoiceEmail: async (
  to: string,
  name: string,
  invoiceDetails: {
    invoiceNumber: string;
    participantName: string;
    startDate: string;
    endDate: string;
    totalAmount: string;
    batchNumber: string;
  }
): Promise<void> => {
  const subject = `Your Invoice ${invoiceDetails.invoiceNumber} for ${invoiceDetails.participantName}`;
  
  const text = `
    Hello ${name},
    
    Your consolidated invoice ${invoiceDetails.invoiceNumber} for services provided to ${invoiceDetails.participantName} between ${invoiceDetails.startDate} and ${invoiceDetails.endDate} has been generated.
    
    Invoice Number: ${invoiceDetails.invoiceNumber}
    Batch Number: ${invoiceDetails.batchNumber}
    Participant: ${invoiceDetails.participantName}
    Period: ${invoiceDetails.startDate} to ${invoiceDetails.endDate}
    Total Amount: $${invoiceDetails.totalAmount}
    
    You can view, download, and send this invoice to the participant from your Guardian Care Pro dashboard.
    
    Thank you for using Guardian Care Pro,
    Guardian Care Pro Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Weekly Invoice Generated</h2>
      <p>Hello ${name},</p>
      <p>Your consolidated invoice <strong>${invoiceDetails.invoiceNumber}</strong> for services provided to <strong>${invoiceDetails.participantName}</strong> between <strong>${invoiceDetails.startDate}</strong> and <strong>${invoiceDetails.endDate}</strong> has been generated.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceDetails.invoiceNumber}</p>
        <p><strong>Batch Number:</strong> ${invoiceDetails.batchNumber}</p>
        <p><strong>Participant:</strong> ${invoiceDetails.participantName}</p>
        <p><strong>Period:</strong> ${invoiceDetails.startDate} to ${invoiceDetails.endDate}</p>
        <p><strong>Total Amount:</strong> $${invoiceDetails.totalAmount}</p>
      </div>
      <p>You can <a href="${config.clientUrl}/dashboard/batch-invoices">view, download, and send this invoice</a> to the participant from your Guardian Care Pro dashboard.</p>
      <p>Thank you for using Guardian Care Pro,<br>Guardian Care Pro Team</p>
    </div>
  `;
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send batch invoices email
 */
sendBatchInvoicesEmail: async (
  to: string,
  name: string,
  batchDetails: {
    invoiceCount: number;
    invoiceNumbers: string;
    totalAmount: string;
    startDate: string;
    endDate: string;
  }
): Promise<void> => {
  const subject = `Batch Invoices (${batchDetails.invoiceCount}) - Guardian Care Pro`;
  
  const text = `
    Hello ${name},
    
    Please find attached ${batchDetails.invoiceCount} invoices for services between ${batchDetails.startDate} and ${batchDetails.endDate}.
    
    Invoice Numbers: ${batchDetails.invoiceNumbers}
    Total Amount: $${batchDetails.totalAmount}
    
    You can view and download these invoices from your Guardian Care Pro dashboard.
    
    Thank you for using Guardian Care Pro,
    Guardian Care Pro Team
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Batch Invoices from Guardian Care Pro</h2>
      <p>Hello ${name},</p>
      <p>Please find ${batchDetails.invoiceCount} invoices for services between <strong>${batchDetails.startDate}</strong> and <strong>${batchDetails.endDate}</strong>.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <p><strong>Invoice Numbers:</strong> ${batchDetails.invoiceNumbers}</p>
        <p><strong>Total Amount:</strong> $${batchDetails.totalAmount}</p>
      </div>
      <p>You can <a href="${config.clientUrl}/dashboard/invoices">view and download these invoices</a> from your Guardian Care Pro dashboard.</p>
      <p>Thank you for using Guardian Care Pro,<br>Guardian Care Pro Team</p>
    </div>
  `;
  
  await emailService.sendEmail(to, subject, text, html);
}
};