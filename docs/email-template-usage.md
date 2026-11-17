# Email Template System Documentation

## Overview

The Guardian Care Pro email template system provides a reusable, professional email template with consistent branding, responsive design, and flexible content sections. All emails sent from the application use the same header, footer, and styling while allowing customized body content.

## Architecture

The email template system consists of three main components:

### 1. **Configuration (`src/config/env.ts`)**
Centralized configuration for email assets including:
- Banner/header image URL
- Logo URL
- Social media icon URLs
- Social media profile links

### 2. **Template Generator (`src/utils/email-template.ts`)**
Core template function and helper utilities:
- `generateEmailTemplate()` - Main template generator
- `createInfoBox()` - Styled information boxes
- `createCodeBox()` - OTP/code display boxes
- `createParagraph()` - Standard text paragraphs
- `createList()` - Ordered/unordered lists
- `createAlertBox()` - Colored alert/notification boxes

### 3. **Email Service (`src/services/email.service.ts`)**
Email sending functions that use the template system.

## Template Structure

Every email consists of:

```
┌─────────────────────────────────┐
│  HEADER (Reusable)              │
│  - Banner Image                 │
│  - Guardian Care Pro Logo               │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  BODY (Customizable)            │
│  - Greeting                     │
│  - Dynamic Content              │
│  - Optional CTA Button          │
│  - Optional Tagline             │
│  - Sign-off                     │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  FOOTER (Reusable)              │
│  - Copyright Notice             │
│  - Company Tagline              │
│  - Social Media Icons           │
└─────────────────────────────────┘
```

## Configuration Setup

### Environment Variables

Add these to your `.env` file:

```env
# Email Assets
EMAIL_BANNER=https://your-cdn.com/banner-image.jpg
LOGO_URL=https://your-cdn.com/logo.png

# Social Media Icons (optional - defaults provided)
FACEBOOK_ICON_URL=https://your-cdn.com/icons/facebook.png
INSTAGRAM_ICON_URL=https://your-cdn.com/icons/instagram.png
LINKEDIN_ICON_URL=https://your-cdn.com/icons/linkedin.png

# Social Media Profile Links
FACEBOOK_URL=https://facebook.com/your-company
INSTAGRAM_URL=https://instagram.com/your-company
LINKEDIN_URL=https://linkedin.com/company/your-company
```

### Recommended Image Specifications

- **Banner Image**: 770px x 219px (or larger with same aspect ratio)
- **Logo**: 200px width (transparent background PNG)
- **Social Icons**: 24px x 24px

## Using the Template System

### Basic Email Example

```typescript
import {
  generateEmailTemplate,
  createParagraph,
  createInfoBox,
  createAlertBox,
} from '../utils/email-template';

const bodyContent = `
  ${createParagraph('Your account has been successfully created.')}
  ${createInfoBox('Account Details', [
    { label: 'Username:', value: 'john.doe' },
    { label: 'Email:', value: 'john@example.com' },
    { label: 'Account Type:', value: 'Premium' },
  ])}
  ${createAlertBox('Welcome to Guardian Care Pro!', 'success')}
`;

const html = generateEmailTemplate({
  preheader: 'Welcome to Guardian Care Pro',
  greeting: 'Dear',
  recipientName: 'John Doe',
  bodyContent,
  showButton: true,
  buttonText: 'Get Started',
  buttonUrl: 'https://app.example.com/dashboard',
  includeTagline: true,
});
```

## Helper Functions Reference

### 1. `generateEmailTemplate(options)`

Main template generator function.

**Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `preheader` | string | 'Guardian Care Pro - Professional Care Services' | Hidden text shown in email preview |
| `greeting` | string | 'Dear' | Greeting word |
| `recipientName` | string | 'there' | Recipient's name |
| `bodyContent` | string | *required* | HTML content for email body |
| `showButton` | boolean | false | Show CTA button |
| `buttonText` | string | 'View Dashboard' | CTA button text |
| `buttonUrl` | string | config.clientUrl/dashboard | CTA button link |
| `includeTagline` | boolean | true | Show company tagline |
| `customBannerUrl` | string | config.assets.emailBanner | Override banner image |

**Example:**

```typescript
const html = generateEmailTemplate({
  preheader: 'Your verification code',
  greeting: 'Hello',
  recipientName: 'Sarah',
  bodyContent: '...',
  showButton: false,
  includeTagline: true,
});
```

### 2. `createInfoBox(title, details)`

Creates a styled information box with key-value pairs.

**Parameters:**
- `title` (string): Box title
- `details` (DetailRow[]): Array of `{ label: string, value: string }`

**Example:**

```typescript
createInfoBox('Shift Details', [
  { label: '📅 Date:', value: '2025-01-15' },
  { label: '⏰ Time:', value: '9:00 AM - 5:00 PM' },
  { label: '📍 Location:', value: 'Downtown Office' },
])
```

### 3. `createCodeBox(code)`

Creates a large, prominent display for codes/OTPs.

**Example:**

```typescript
createCodeBox('A1B2C3')
```

### 4. `createParagraph(text)`

Creates a standard paragraph with proper styling.

**Example:**

```typescript
createParagraph('Your request has been processed successfully.')
```

### 5. `createList(items, ordered)`

Creates a bulleted or numbered list.

**Parameters:**
- `items` (string[]): List items
- `ordered` (boolean): Use numbered list (default: false)

**Example:**

```typescript
createList([
  'Complete your profile',
  'Upload required documents',
  'Schedule your first shift',
], false)
```

### 6. `createAlertBox(message, type)`

Creates a colored alert box.

**Types:** `'info'` | `'warning'` | `'success'` | `'error'`

**Example:**

```typescript
createAlertBox('⚠️ Your document expires in 5 days', 'warning')
createAlertBox('✅ Payment processed successfully', 'success')
```

## Real-World Examples

### Example 1: OTP Verification Email

```typescript
sendVerificationOTP: async (to: string, name: string, otpCode: string) => {
  const bodyContent = `
    ${createParagraph('Thank you for creating an account with Guardian Care Pro!')}
    ${createParagraph('Your verification code is:')}
    ${createCodeBox(otpCode)}
    ${createAlertBox('⏱️ This code will expire in 10 minutes.', 'warning')}
    ${createParagraph('If you did not create an account, please ignore this email.')}
  `;

  const html = generateEmailTemplate({
    preheader: 'Your verification code for Guardian Care Pro',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: false,
    includeTagline: true,
  });

  await emailService.sendEmail(to, 'Email Verification Code', text, html);
};
```

### Example 2: Shift Booking Notification

```typescript
sendShiftBooking: async (to: string, name: string, details: ShiftDetails) => {
  const bodyContent = `
    ${createParagraph(`A new shift has been booked for ${details.participantName}:`)}
    ${createInfoBox('Shift Details', [
      { label: '📅 Date:', value: details.date },
      { label: '⏰ Time:', value: `${details.startTime} - ${details.endTime}` },
      { label: '🏥 Service:', value: details.serviceType },
      { label: '📍 Location:', value: details.location },
    ])}
    ${createParagraph('View full details in your dashboard.')}
  `;

  const html = generateEmailTemplate({
    preheader: `New shift booking for ${details.participantName}`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Shift Details',
    buttonUrl: `${config.clientUrl}/dashboard/shifts`,
    includeTagline: true,
  });

  await emailService.sendEmail(to, 'New Shift Booking', text, html);
};
```

### Example 3: Invoice Email

```typescript
sendInvoice: async (to: string, name: string, invoice: InvoiceDetails) => {
  const bodyContent = `
    ${createParagraph(`Your invoice ${invoice.number} is ready.`)}
    ${createInfoBox('Invoice Details', [
      { label: '📄 Invoice Number:', value: invoice.number },
      { label: '📅 Date:', value: invoice.date },
      { label: '⏰ Due Date:', value: invoice.dueDate },
      { label: '💰 Amount:', value: `$${invoice.amount}` },
    ])}
    ${createAlertBox('Payment is due within 14 days.', 'info')}
  `;

  const html = generateEmailTemplate({
    preheader: `Invoice ${invoice.number} from Guardian Care Pro`,
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'View Invoice',
    buttonUrl: `${config.clientUrl}/dashboard/invoices`,
    includeTagline: true,
  });

  await emailService.sendEmail(to, `Invoice ${invoice.number}`, text, html);
};
```

## Adding New Email Types

To add a new email type:

1. **Create the email service function** in `src/services/email.service.ts`
2. **Define the content** using helper functions
3. **Generate the template** with appropriate options
4. **Send the email** using `emailService.sendEmail()`

### Template:

```typescript
sendNewEmailType: async (
  to: string,
  name: string,
  details: YourDetailsType
): Promise<void> => {
  const subject = 'Your Email Subject - Guardian Care Pro';
  
  // Plain text version (for email clients that don't support HTML)
  const text = `
    Hello ${name},
    
    [Plain text version of your email content]
  `;
  
  // HTML body content using helper functions
  const bodyContent = `
    ${createParagraph('Your introduction paragraph...')}
    ${createInfoBox('Details Title', [
      { label: 'Field 1:', value: details.field1 },
      { label: 'Field 2:', value: details.field2 },
    ])}
    ${createAlertBox('Your alert message', 'info')}
    ${createParagraph('Your conclusion paragraph...')}
  `;
  
  // Generate full HTML email
  const html = generateEmailTemplate({
    preheader: 'Short preview text',
    greeting: 'Dear',
    recipientName: name,
    bodyContent,
    showButton: true,
    buttonText: 'Take Action',
    buttonUrl: `${config.clientUrl}/dashboard/action`,
    includeTagline: true,
  });
  
  // Send the email
  await emailService.sendEmail(to, subject, text, html);
},
```

## Best Practices

### 1. **Always Provide Plain Text**
Email clients that don't support HTML will use the plain text version.

### 2. **Use Emojis Sparingly**
Emojis enhance readability but use them professionally:
- ✅ Good for labels (📅, ⏰, 📍, 💰)
- ❌ Avoid in professional body text

### 3. **Keep Preheaders Short**
Preheaders should be 40-130 characters for optimal display.

### 4. **Button Text Should Be Action-Oriented**
- ✅ "View Invoice", "Complete Profile", "Get Started"
- ❌ "Click Here", "Link", "Read More"

### 5. **Test Across Email Clients**
The template is optimized for:
- Gmail (Desktop & Mobile)
- Outlook (Desktop & Web)
- Apple Mail
- Yahoo Mail
- Mobile email apps

### 6. **Image Hosting**
Always use:
- HTTPS URLs
- CDN or cloud storage (not local files)
- Optimized images (compress before uploading)

### 7. **Personalization**
Always use the recipient's name when available:
```typescript
recipientName: user.firstName || user.name || 'there'
```

## Troubleshooting

### Images Not Displaying

**Problem:** Banner or social icons not showing

**Solutions:**
1. Verify image URLs are accessible (try opening in browser)
2. Ensure URLs use HTTPS
3. Check image file formats (PNG, JPG, GIF supported)
4. Some email clients block images by default - users must "Show Images"

### Styling Issues

**Problem:** Email looks different in Outlook

**Solutions:**
1. The template includes Outlook-specific fixes (MSO conditionals)
2. Use table-based layout (already implemented)
3. Inline styles are used for maximum compatibility

### Button Not Clickable

**Problem:** CTA button not working

**Solutions:**
1. Verify `buttonUrl` is a valid, complete URL
2. Check `showButton` is set to `true`
3. Ensure URL includes protocol (`https://`)

## Customization

### Changing Colors

Edit `src/utils/email-template.ts`:

```typescript
// Primary color (buttons, borders)
background-color: #0D2BEC; // Blue

// Success color
background-color: #28a745; // Green

// Warning color  
background-color: #FFA500; // Orange

// Error color
background-color: #dc3545; // Red

// Footer background
background: #050F53; // Dark blue
```

### Changing Fonts

The template uses Google Fonts (Montserrat). To change:

```html
<!-- Update the font link in template head -->
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@100;400;600;700&display=swap" rel="stylesheet">

<!-- Update the font-family in styles -->
font-family: "YourFont", "Segoe UI", Arial, sans-serif;
```

### Custom Template Variants

You can create specialized templates:

```typescript
export const generateTransactionalEmail = (options: EmailTemplateOptions) => {
  // Template without tagline, focused design
  return generateEmailTemplate({
    ...options,
    includeTagline: false,
  });
};

export const generateMarketingEmail = (options: EmailTemplateOptions) => {
  // Template with more visual elements
  return generateEmailTemplate({
    ...options,
    includeTagline: true,
    // Additional marketing-specific options
  });
};
```

## Support

For issues or questions about the email template system:
1. Check this documentation
2. Review example implementations in `src/services/email.service.ts`
3. Test in a development environment first
4. Contact the development team

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Maintainer:** Guardian Care Pro Development Team

