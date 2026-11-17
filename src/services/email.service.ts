/**
 * Email service
 * Handles sending email notifications to users
 */

import nodemailer from 'nodemailer';
import config from '../config/env';
import logger from '../utils/logger';
import {
  generateEmailTemplate,
  createInfoBox,
  createCodeBox,
  createParagraph,
  createAlertBox,
} from '../utils/email-template';

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
    .catch((error: unknown) =>
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
    `;
    
    const bodyContent = `
      ${createParagraph('Thank you for creating an account with Guardian Care Pro! Your verification code is:')}
      ${createCodeBox(otpCode)}
      ${createAlertBox('⏱️ This code will expire in 10 minutes.', 'warning')}
      ${createParagraph('If you did not create an account with us, please ignore this email.')}
    `;

    const html = generateEmailTemplate({
      preheader: 'Your verification code for Guardian Care Pro',
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: false,
      includeTagline: true,
    });
    
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
    `;
    
    const bodyContent = `
      ${createParagraph('You requested to reset your password. Your password reset code is:')}
      ${createCodeBox(otpCode)}
      ${createAlertBox('⏱️ This code will expire in 10 minutes.', 'warning')}
      ${createAlertBox('If you didn\'t request this, please ignore this email and your password will remain unchanged.', 'info')}
    `;
    
    const html = generateEmailTemplate({
      preheader: 'Reset your Guardian Care Pro password',
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: false,
      includeTagline: true,
    });
    
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
    `;
    
    const bodyContent = `
      ${createParagraph(`A new shift has been booked ${recipientDetails}:`)}
      ${createInfoBox('Shift Details', [
        { label: '📅 Date:', value: shiftDetails.date },
        { label: '⏰ Time:', value: `${shiftDetails.startTime} - ${shiftDetails.endTime}` },
        { label: '🏥 Service:', value: shiftDetails.serviceType },
        { label: '📍 Location:', value: shiftDetails.location },
      ])}
      ${createParagraph('You can view the full details and manage this booking in your Guardian Care Pro dashboard.')}
    `;
    
    const html = generateEmailTemplate({
      preheader: `New shift booking ${recipientDetails}`,
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: true,
      buttonText: 'View Shift Details',
      buttonUrl: `${config.clientUrl}/dashboard/shifts`,
      includeTagline: true,
    });
    
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
    `;
    
    const alertType = timesheetDetails.status.toLowerCase() === 'approved' ? 'success' : 
                      timesheetDetails.status.toLowerCase() === 'rejected' ? 'error' : 'info';
    
    const bodyContent = `
      ${createParagraph(`The timesheet for ${timesheetDetails.date} with ${timesheetDetails.participantName} has been <strong>${timesheetDetails.status}</strong>.`)}
      ${createInfoBox('Timesheet Details', [
        { label: '👤 Worker:', value: timesheetDetails.workerName },
        { label: '📅 Date:', value: timesheetDetails.date },
        { label: '⏱️ Hours:', value: `${timesheetDetails.hours}` },
        { label: '📋 Status:', value: timesheetDetails.status },
      ])}
      ${createAlertBox(`Timesheet has been ${timesheetDetails.status}`, alertType)}
      ${createParagraph('You can view all timesheet details in your Guardian Care Pro dashboard.')}
    `;
    
    const html = generateEmailTemplate({
      preheader: `Timesheet ${timesheetDetails.status} for ${timesheetDetails.date}`,
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: true,
      buttonText: 'View Timesheets',
      buttonUrl: `${config.clientUrl}/dashboard/timesheets`,
      includeTagline: true,
    });
    
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
    `;
    
    const alertType = documentDetails.status.toLowerCase() === 'approved' ? 'success' : 
                      documentDetails.status.toLowerCase() === 'rejected' ? 'error' : 'warning';
    
    const bodyContent = `
      ${createParagraph(`The status of your <strong>${documentDetails.documentType}</strong> document has been updated to <strong>${documentDetails.status}</strong>.`)}
      ${documentDetails.notes ? createAlertBox(`<strong>Notes:</strong> ${documentDetails.notes}`, 'info') : ''}
      ${createAlertBox(
        documentDetails.status === 'rejected'
          ? '⚠️ Please log in to your account to update the document.'
          : '✅ You can view the details in your account.',
        alertType
      )}
    `;
    
    const html = generateEmailTemplate({
      preheader: `Document verification ${documentDetails.status}`,
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: true,
      buttonText: documentDetails.status === 'rejected' ? 'Update Document' : 'View Documents',
      buttonUrl: `${config.clientUrl}/dashboard/documents`,
      includeTagline: true,
    });
    
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
    `;
    
    const bodyContent = `
      ${createParagraph('Thank you for subscribing to Guardian Care Pro! Your subscription has been confirmed.')}
      ${createInfoBox('Subscription Details', [
        { label: '📦 Tier:', value: subscriptionDetails.tier },
        { label: '📅 Start Date:', value: subscriptionDetails.startDate },
        { label: '💰 Amount:', value: subscriptionDetails.amount },
        { label: '🔄 Next Renewal:', value: subscriptionDetails.renewalDate },
      ])}
      ${createAlertBox('✅ Your subscription is now active!', 'success')}
      ${createParagraph('You can manage your subscription from your account settings.')}
    `;
    
    const html = generateEmailTemplate({
      preheader: 'Your Guardian Care Pro subscription is confirmed',
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: true,
      buttonText: 'Manage Subscription',
      buttonUrl: `${config.clientUrl}/settings/subscription`,
      includeTagline: true,
    });
    
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
    `;
    
    const bodyContent = `
      ${createParagraph(`This is a reminder that your <strong>${documentDetails.documentType}</strong> is expiring soon.`)}
      ${createInfoBox('Document Expiry Details', [
        { label: '📄 Document Type:', value: documentDetails.documentType },
        { label: '📅 Expiry Date:', value: documentDetails.expiryDate },
        { label: '⏰ Days Remaining:', value: `${documentDetails.daysRemaining} days` },
      ])}
      ${createAlertBox(`⚠️ Please update your document before it expires to ensure continued access to the platform.`, 'warning')}
      ${createParagraph('You can upload a new document from your account dashboard.')}
    `;
    
    const html = generateEmailTemplate({
      preheader: `Your ${documentDetails.documentType} expires in ${documentDetails.daysRemaining} days`,
      greeting: 'Dear',
      recipientName: name,
      bodyContent,
      showButton: true,
      buttonText: 'Upload New Document',
      buttonUrl: `${config.clientUrl}/dashboard/documents`,
      includeTagline: true,
    });
    
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
  `;
  
  const bodyContent = `
    ${createParagraph(`Please find your invoice <strong>${invoiceDetails.invoiceNumber}</strong> from <strong>${invoiceDetails.workerName}</strong>.`)}
    ${createInfoBox('Invoice Details', [
      { label: '📄 Invoice Number:', value: invoiceDetails.invoiceNumber },
      { label: '📅 Date:', value: invoiceDetails.invoiceDate },
      { label: '⏰ Due Date:', value: invoiceDetails.dueDate },
      { label: '💰 Amount:', value: `$${invoiceDetails.amount}` },
    ])}
    ${createParagraph('You can view and download the invoice from your Guardian Care Pro dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: `Invoice ${invoiceDetails.invoiceNumber} from ${invoiceDetails.workerName}`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Invoice',
    buttonUrl: `${config.clientUrl}/dashboard/invoices`,
    includeTagline: true,
  });
  
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
  `;
  
  const bodyContent = `
    ${createParagraph(`Please find your consolidated invoice <strong>${invoiceDetails.invoiceNumber}</strong> from <strong>${invoiceDetails.workerName}</strong> for services provided between <strong>${invoiceDetails.startDate}</strong> and <strong>${invoiceDetails.endDate}</strong>.`)}
    ${createInfoBox('Weekly Invoice Summary', [
      { label: '📄 Invoice Number:', value: invoiceDetails.invoiceNumber },
      { label: '🔢 Batch Number:', value: invoiceDetails.batchNumber },
      { label: '📅 Period:', value: `${invoiceDetails.startDate} to ${invoiceDetails.endDate}` },
      { label: '💰 Total Amount:', value: `$${invoiceDetails.totalAmount}` },
    ])}
    ${createParagraph('You can view and download the detailed invoice from your Guardian Care Pro dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: `Consolidated invoice for ${invoiceDetails.startDate} - ${invoiceDetails.endDate}`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Batch Invoice',
    buttonUrl: `${config.clientUrl}/dashboard/batch-invoices`,
    includeTagline: true,
  });
  
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
  `;
  
  const bodyContent = `
    ${createParagraph(`Your consolidated invoice <strong>${invoiceDetails.invoiceNumber}</strong> for services provided to <strong>${invoiceDetails.participantName}</strong> between <strong>${invoiceDetails.startDate}</strong> and <strong>${invoiceDetails.endDate}</strong> has been generated.`)}
    ${createInfoBox('Weekly Invoice Generated', [
      { label: '📄 Invoice Number:', value: invoiceDetails.invoiceNumber },
      { label: '🔢 Batch Number:', value: invoiceDetails.batchNumber },
      { label: '👤 Participant:', value: invoiceDetails.participantName },
      { label: '📅 Period:', value: `${invoiceDetails.startDate} to ${invoiceDetails.endDate}` },
      { label: '💰 Total Amount:', value: `$${invoiceDetails.totalAmount}` },
    ])}
    ${createAlertBox('✅ Your invoice is ready to view and send!', 'success')}
    ${createParagraph('You can view, download, and send this invoice to the participant from your Guardian Care Pro dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: `Your invoice for ${invoiceDetails.participantName} is ready`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View & Send Invoice',
    buttonUrl: `${config.clientUrl}/dashboard/batch-invoices`,
    includeTagline: true,
  });
  
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
    
    Please find ${batchDetails.invoiceCount} invoices for services between ${batchDetails.startDate} and ${batchDetails.endDate}.
    
    Invoice Numbers: ${batchDetails.invoiceNumbers}
    Total Amount: $${batchDetails.totalAmount}
    
    You can view and download these invoices from your Guardian Care Pro dashboard.
  `;
  
  const bodyContent = `
    ${createParagraph(`Please find <strong>${batchDetails.invoiceCount} invoices</strong> for services between <strong>${batchDetails.startDate}</strong> and <strong>${batchDetails.endDate}</strong>.`)}
    ${createInfoBox('Batch Invoice Summary', [
      { label: '🔢 Invoice Count:', value: `${batchDetails.invoiceCount}` },
      { label: '📄 Invoice Numbers:', value: batchDetails.invoiceNumbers },
      { label: '📅 Period:', value: `${batchDetails.startDate} to ${batchDetails.endDate}` },
      { label: '💰 Total Amount:', value: `$${batchDetails.totalAmount}` },
    ])}
    ${createParagraph('You can view and download these invoices from your Guardian Care Pro dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: `${batchDetails.invoiceCount} invoices for ${batchDetails.startDate} - ${batchDetails.endDate}`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View All Invoices',
    buttonUrl: `${config.clientUrl}/dashboard/invoices`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send shift confirmation notification to participant
 */
sendShiftConfirmationEmail: async (
  to: string,
  name: string,
  shiftDetails: {
    date: string;
    startTime: string;
    endTime: string;
    workerName: string;
    serviceType: string;
    location: string;
  }
): Promise<void> => {
  const subject = 'Shift Confirmed - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    Good news! ${shiftDetails.workerName} has confirmed your shift.
    
    Date: ${shiftDetails.date}
    Time: ${shiftDetails.startTime} - ${shiftDetails.endTime}
    Service: ${shiftDetails.serviceType}
    Location: ${shiftDetails.location}
    
    You can view the details in your Guardian Care Pro dashboard.
  `;
  
  const bodyContent = `
    ${createParagraph(`Good news! <strong>${shiftDetails.workerName}</strong> has confirmed your shift.`)}
    ${createInfoBox('Confirmed Shift Details', [
      { label: '📅 Date:', value: shiftDetails.date },
      { label: '⏰ Time:', value: `${shiftDetails.startTime} - ${shiftDetails.endTime}` },
      { label: '👤 Worker:', value: shiftDetails.workerName },
      { label: '🏥 Service:', value: shiftDetails.serviceType },
      { label: '📍 Location:', value: shiftDetails.location },
    ])}
    ${createAlertBox('✅ Your shift is now confirmed and scheduled!', 'success')}
    ${createParagraph('You can view all shift details in your Guardian Care Pro dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: `${shiftDetails.workerName} confirmed your shift`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Shift Details',
    buttonUrl: `${config.clientUrl}/dashboard/shifts`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send shift decline notification to participant
 */
sendShiftDeclineEmail: async (
  to: string,
  name: string,
  shiftDetails: {
    date: string;
    startTime: string;
    endTime: string;
    workerName: string;
    serviceType: string;
    reason?: string;
  }
): Promise<void> => {
  const subject = 'Shift Declined - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    ${shiftDetails.workerName} has declined your shift request.
    
    Date: ${shiftDetails.date}
    Time: ${shiftDetails.startTime} - ${shiftDetails.endTime}
    Service: ${shiftDetails.serviceType}
    ${shiftDetails.reason ? `Reason: ${shiftDetails.reason}` : ''}
    
    The shift is now available for other workers to accept.
  `;
  
  const bodyContent = `
    ${createParagraph(`<strong>${shiftDetails.workerName}</strong> has declined your shift request.`)}
    ${createInfoBox('Declined Shift Details', [
      { label: '📅 Date:', value: shiftDetails.date },
      { label: '⏰ Time:', value: `${shiftDetails.startTime} - ${shiftDetails.endTime}` },
      { label: '👤 Worker:', value: shiftDetails.workerName },
      { label: '🏥 Service:', value: shiftDetails.serviceType },
    ])}
    ${shiftDetails.reason ? createAlertBox(`<strong>Reason:</strong> ${shiftDetails.reason}`, 'info') : ''}
    ${createAlertBox('⚠️ This shift is now available for other workers to accept.', 'warning')}
    ${createParagraph('You can reassign this shift or post it as an open shift in your dashboard.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: 'Shift declined - action needed',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'Reassign Shift',
    buttonUrl: `${config.clientUrl}/dashboard/shifts`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send shift completion notification to participant
 */
sendShiftCompletionEmail: async (
  to: string,
  name: string,
  shiftDetails: {
    date: string;
    workerName: string;
    serviceType: string;
    startTime: string;
    endTime: string;
  }
): Promise<void> => {
  const subject = 'Shift Completed - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    ${shiftDetails.workerName} has marked the shift as completed.
    
    Date: ${shiftDetails.date}
    Service: ${shiftDetails.serviceType}
    Time: ${shiftDetails.startTime} - ${shiftDetails.endTime}
    
    A timesheet will be submitted soon for your review.
  `;
  
  const bodyContent = `
    ${createParagraph(`<strong>${shiftDetails.workerName}</strong> has marked the shift as completed.`)}
    ${createInfoBox('Completed Shift Details', [
      { label: '📅 Date:', value: shiftDetails.date },
      { label: '👤 Worker:', value: shiftDetails.workerName },
      { label: '🏥 Service:', value: shiftDetails.serviceType },
      { label: '⏰ Time:', value: `${shiftDetails.startTime} - ${shiftDetails.endTime}` },
    ])}
    ${createAlertBox('✅ Shift completed successfully!', 'success')}
    ${createParagraph('A timesheet will be submitted soon for your review and approval.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: 'Shift completed - timesheet pending',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Shift',
    buttonUrl: `${config.clientUrl}/dashboard/shifts`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send shift cancellation notification
 */
sendShiftCancellationEmail: async (
  to: string,
  name: string,
  shiftDetails: {
    date: string;
    startTime: string;
    endTime: string;
    cancelledBy: string;
    serviceType: string;
    reason?: string;
    note?: string;
  },
  isWorker: boolean = false
): Promise<void> => {
  const subject = 'Shift Cancelled - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    ${shiftDetails.cancelledBy} has cancelled the shift.
    
    Date: ${shiftDetails.date}
    Time: ${shiftDetails.startTime} - ${shiftDetails.endTime}
    Service: ${shiftDetails.serviceType}
    ${shiftDetails.reason ? `Reason: ${shiftDetails.reason}` : ''}
    ${shiftDetails.note ? `Note: ${shiftDetails.note}` : ''}
  `;
  
  const bodyContent = `
    ${createParagraph(`<strong>${shiftDetails.cancelledBy}</strong> has cancelled the shift.`)}
    ${createInfoBox('Cancelled Shift Details', [
      { label: '📅 Date:', value: shiftDetails.date },
      { label: '⏰ Time:', value: `${shiftDetails.startTime} - ${shiftDetails.endTime}` },
      { label: '🏥 Service:', value: shiftDetails.serviceType },
      { label: '❌ Cancelled By:', value: shiftDetails.cancelledBy },
    ])}
    ${shiftDetails.reason ? createAlertBox(`<strong>Reason:</strong> ${shiftDetails.reason}`, 'info') : ''}
    ${shiftDetails.note ? createAlertBox(`<strong>Note:</strong> ${shiftDetails.note}`, 'info') : ''}
    ${createAlertBox('⚠️ This shift has been cancelled.', 'error')}
    ${isWorker ? 
      createParagraph('This shift has been removed from your schedule.') :
      createParagraph('You may reschedule this shift or assign a different worker.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: 'Shift cancelled',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Dashboard',
    buttonUrl: `${config.clientUrl}/dashboard/shifts`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send timesheet submission notification to participant
 */
sendTimesheetSubmissionEmail: async (
  to: string,
  name: string,
  timesheetDetails: {
    shiftDate: string;
    workerName: string;
    hours: number;
    amount: string;
  }
): Promise<void> => {
  const subject = 'Timesheet Submitted - Review Required - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    ${timesheetDetails.workerName} has submitted a timesheet for your review.
    
    Shift Date: ${timesheetDetails.shiftDate}
    Hours Worked: ${timesheetDetails.hours}
    Amount: ${timesheetDetails.amount}
    
    Please review and approve or reject the timesheet.
  `;
  
  const bodyContent = `
    ${createParagraph(`<strong>${timesheetDetails.workerName}</strong> has submitted a timesheet for your review.`)}
    ${createInfoBox('Timesheet Summary', [
      { label: '📅 Shift Date:', value: timesheetDetails.shiftDate },
      { label: '👤 Worker:', value: timesheetDetails.workerName },
      { label: '⏱️ Hours Worked:', value: `${timesheetDetails.hours} hours` },
      { label: '💰 Amount:', value: timesheetDetails.amount },
    ])}
    ${createAlertBox('📋 Action required: Please review and approve or reject this timesheet.', 'warning')}
    ${createParagraph('Log in to your dashboard to review the details and take action.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: 'New timesheet submitted - review needed',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'Review Timesheet',
    buttonUrl: `${config.clientUrl}/dashboard/timesheets`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
},

/**
 * Send timesheet revision notification to participant
 */
sendTimesheetRevisionEmail: async (
  to: string,
  name: string,
  timesheetDetails: {
    shiftDate: string;
    workerName: string;
    hours: number;
    amount: string;
  }
): Promise<void> => {
  const subject = 'Timesheet Revised - Review Required - Guardian Care Pro';
  
  const text = `
    Hello ${name},
    
    ${timesheetDetails.workerName} has revised and resubmitted the timesheet.
    
    Shift Date: ${timesheetDetails.shiftDate}
    Hours Worked: ${timesheetDetails.hours}
    Amount: ${timesheetDetails.amount}
    
    Please review the updated timesheet.
  `;
  
  const bodyContent = `
    ${createParagraph(`<strong>${timesheetDetails.workerName}</strong> has revised and resubmitted the timesheet.`)}
    ${createInfoBox('Revised Timesheet Summary', [
      { label: '📅 Shift Date:', value: timesheetDetails.shiftDate },
      { label: '👤 Worker:', value: timesheetDetails.workerName },
      { label: '⏱️ Hours Worked:', value: `${timesheetDetails.hours} hours` },
      { label: '💰 Amount:', value: timesheetDetails.amount },
    ])}
    ${createAlertBox('📋 The timesheet has been updated. Please review the changes.', 'info')}
    ${createParagraph('Log in to your dashboard to review the revised timesheet and take action.')}
  `;
  
  const html = generateEmailTemplate({
    preheader: 'Timesheet revised - review needed',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'Review Revised Timesheet',
    buttonUrl: `${config.clientUrl}/dashboard/timesheets`,
    includeTagline: true,
  });
  
  await emailService.sendEmail(to, subject, text, html);
}
};