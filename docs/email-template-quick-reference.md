# Email Template Quick Reference

## Helper Functions Cheat Sheet

### 📝 Basic Content

```typescript
// Paragraph
createParagraph('Your text here')

// Code/OTP Display
createCodeBox('A1B2C3')

// List
createList(['Item 1', 'Item 2', 'Item 3'], false) // false = bullets, true = numbered
```

### 📦 Info Box

```typescript
createInfoBox('Box Title', [
  { label: 'Label 1:', value: 'Value 1' },
  { label: 'Label 2:', value: 'Value 2' },
])
```

### 🚨 Alert Box

```typescript
// Types: 'info', 'success', 'warning', 'error'
createAlertBox('Your message', 'success')  // Green
createAlertBox('Your message', 'warning')  // Orange
createAlertBox('Your message', 'error')    // Red
createAlertBox('Your message', 'info')     // Blue
```

## Template Generation

```typescript
generateEmailTemplate({
  // Required
  bodyContent: '...',  // Your HTML content
  
  // Optional
  preheader: 'Preview text',
  greeting: 'Dear',
  recipientName: 'John',
  showButton: true,
  buttonText: 'Click Here',
  buttonUrl: 'https://...',
  includeTagline: true,
  customBannerUrl: 'https://...',
})
```

## Complete Example

```typescript
import {
  generateEmailTemplate,
  createParagraph,
  createInfoBox,
  createCodeBox,
  createAlertBox,
} from '../utils/email-template';

const bodyContent = `
  ${createParagraph('Welcome to Support24!')}
  ${createCodeBox('ABC123')}
  ${createInfoBox('Details', [
    { label: 'Field:', value: 'Value' },
  ])}
  ${createAlertBox('Note: Important info', 'info')}
`;

const html = generateEmailTemplate({
  preheader: 'Welcome email',
  recipientName: userName,
  bodyContent,
  showButton: true,
  buttonText: 'Get Started',
  buttonUrl: `${config.clientUrl}/dashboard`,
});

await emailService.sendEmail(to, subject, text, html);
```

## Emoji Icons Reference

**Common Use Cases:**

| Icon | Code | Use For |
|------|------|---------|
| 📅 | `\u{1F4C5}` | Dates |
| ⏰ | `\u{23F0}` | Time |
| 📍 | `\u{1F4CD}` | Location |
| 💰 | `\u{1F4B0}` | Money/Amount |
| 📄 | `\u{1F4C4}` | Documents |
| 👤 | `\u{1F464}` | User/Person |
| 🏥 | `\u{1F3E5}` | Healthcare/Service |
| ✅ | `\u{2705}` | Success |
| ⚠️ | `\u{26A0}` | Warning |
| 🔢 | `\u{1F522}` | Numbers |
| 📦 | `\u{1F4E6}` | Package/Tier |
| 🔄 | `\u{1F504}` | Renewal |
| ⏱️ | `\u{23F1}` | Timer/Duration |
| 📋 | `\u{1F4CB}` | Status |

## Common Patterns

### Pattern 1: OTP/Verification

```typescript
const bodyContent = `
  ${createParagraph('Your verification code:')}
  ${createCodeBox(otpCode)}
  ${createAlertBox('⏱️ Expires in 10 minutes', 'warning')}
`;
```

### Pattern 2: Details Notification

```typescript
const bodyContent = `
  ${createParagraph('Description text...')}
  ${createInfoBox('Title', [
    { label: '📅 Date:', value: date },
    { label: '💰 Amount:', value: `$${amount}` },
  ])}
  ${createParagraph('Additional info...')}
`;
```

### Pattern 3: Status Update

```typescript
const bodyContent = `
  ${createParagraph('Your request has been processed.')}
  ${createAlertBox('✅ Status: Approved', 'success')}
  ${createParagraph('Next steps...')}
`;
```

## Colors Reference

| Color | Hex | Use For |
|-------|-----|---------|
| Primary Blue | `#0D2BEC` | Buttons, borders |
| Dark Blue | `#050F53` | Footer background |
| Success Green | `#28a745` | Success alerts |
| Warning Orange | `#FFA500` | Warning alerts |
| Error Red | `#dc3545` | Error alerts |
| Info Blue | `#0D2BEC15` | Info alerts (15% opacity) |
| Light Gray | `#F7F7F7` | Info boxes |

## Testing Checklist

- [ ] Plain text version provided
- [ ] Preheader under 130 characters
- [ ] Recipient name used
- [ ] Button URL is complete and valid
- [ ] All image URLs use HTTPS
- [ ] Test on Gmail (desktop)
- [ ] Test on Gmail (mobile)
- [ ] Test on Outlook
- [ ] Test on Apple Mail

