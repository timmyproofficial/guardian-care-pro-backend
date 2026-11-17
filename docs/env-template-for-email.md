# Environment Variables for Email Templates

## Required Email Asset Variables

Add these variables to your `.env` file to configure the email template system:

```env
# Email Assets - REQUIRED
# Upload your banner image to Cloudinary/CDN (recommended: 770px x 219px)
EMAIL_BANNER=https://res.cloudinary.com/your-cloud/image/upload/v1/email-assets/banner.jpg

# Company logo for email header (recommended: 200px width, transparent PNG)
LOGO_URL=https://res.cloudinary.com/your-cloud/image/upload/v1/email-assets/logo.png

# Social Media Icons - OPTIONAL (defaults to free icons if not specified)
FACEBOOK_ICON_URL=https://cdn-icons-png.flaticon.com/512/124/124010.png
INSTAGRAM_ICON_URL=https://cdn-icons-png.flaticon.com/512/2111/2111463.png
LINKEDIN_ICON_URL=https://cdn-icons-png.flaticon.com/512/174/174857.png

# Social Media Profile Links - OPTIONAL (defaults to '#' if not specified)
FACEBOOK_URL=https://facebook.com/your-company
INSTAGRAM_URL=https://instagram.com/your-company  
LINKEDIN_URL=https://linkedin.com/company/your-company
```

## Quick Setup Guide

### Step 1: Prepare Your Images

1. **Banner Image**
   - Size: 770px x 219px (or larger with same ratio)
   - Format: JPG or PNG
   - Content: Your brand header/logo on attractive background
   - Optimize: Compress to < 200KB

2. **Logo Image**
   - Size: 200px width
   - Format: PNG with transparent background
   - Content: Your company logo
   - Optimize: Compress to < 50KB

3. **Social Icons** (optional)
   - Size: 24px x 24px each
   - Format: PNG
   - Content: Facebook, Instagram, LinkedIn icons
   - Note: Default free icons provided if you skip this

### Step 2: Upload to CDN

#### Option A: Cloudinary (Recommended)

1. Sign up for free at [cloudinary.com](https://cloudinary.com)
2. Upload your images to a folder called `email-assets`
3. Get the public URLs for each image
4. Add URLs to your `.env` file

Example Cloudinary URLs:
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/email-assets/banner.jpg
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/email-assets/logo.png
```

#### Option B: AWS S3

1. Create an S3 bucket with public read access
2. Upload images
3. Get the public URLs
4. Add URLs to your `.env` file

#### Option C: Other CDN

Any CDN or image hosting service works, just ensure:
- URLs are publicly accessible
- URLs use HTTPS
- Images load quickly

### Step 3: Update Social Media Links

Replace the placeholder URLs with your actual social media profiles:

```env
FACEBOOK_URL=https://facebook.com/YourPageName
INSTAGRAM_URL=https://instagram.com/YourUsername
LINKEDIN_URL=https://linkedin.com/company/YourCompany
```

### Step 4: Test Your Configuration

After adding the variables:

1. Restart your application
2. Trigger a test email (e.g., create test account with OTP)
3. Check that:
   - Banner displays correctly
   - Logo shows in header
   - Social icons appear in footer
   - Social links work

## Image Specifications

### Banner Image Best Practices

- **Resolution**: 770px x 219px (desktop), scales for mobile
- **File Size**: < 200KB for fast loading
- **Content Guidelines**:
  - Company logo/branding
  - Professional background (gradient, pattern, solid color)
  - High contrast for readability
  - No critical text (may be cut off on mobile)

### Logo Image Best Practices

- **Resolution**: 200px width (height auto)
- **File Size**: < 50KB
- **Format**: PNG with transparent background
- **Content**: Clean, simple logo (text + icon or text only)

### Social Icons Best Practices

- **Resolution**: 24px x 24px
- **File Size**: < 10KB each
- **Format**: PNG
- **Style**: Match your brand colors or use standard platform colors

## Free Image Resources

### For Social Media Icons

If you don't have custom icons, use these free sources:

1. **Flaticon** (default in template)
   - Facebook: `https://cdn-icons-png.flaticon.com/512/124/124010.png`
   - Instagram: `https://cdn-icons-png.flaticon.com/512/2111/2111463.png`
   - LinkedIn: `https://cdn-icons-png.flaticon.com/512/174/174857.png`

2. **Font Awesome CDN**
   - Available at: `https://fontawesome.com`

3. **Icons8**
   - Available at: `https://icons8.com`

### For Banner Templates

1. **Canva** (free account)
   - Pre-made templates
   - Size: Custom 770 x 219
   - Export as JPG/PNG

2. **Figma** (free account)
   - Professional designs
   - Export at 2x for retina displays

## Troubleshooting

### Banner/Logo Not Showing

**Problem**: Images don't display in emails

**Solutions**:
- ✅ Verify URLs are publicly accessible (open in browser)
- ✅ Ensure HTTPS (not HTTP)
- ✅ Check file extensions (.jpg, .png)
- ✅ Clear cache and test again
- ✅ Some email clients block images by default

### Images Too Large/Slow

**Problem**: Emails take long to load

**Solutions**:
- ✅ Compress images (use TinyPNG or similar)
- ✅ Resize to exact dimensions needed
- ✅ Use CDN with good global coverage
- ✅ Convert large PNGs to JPG if no transparency needed

### Wrong Image Dimensions

**Problem**: Images look stretched or pixelated

**Solutions**:
- ✅ Use exact recommended dimensions
- ✅ Maintain aspect ratio when resizing
- ✅ Export at 2x resolution for retina displays
- ✅ Use image optimization tools

## Development vs Production

### Development Setup

```env
# Use placeholder images for development
EMAIL_BANNER=https://via.placeholder.com/770x219/0D2BEC/FFFFFF?text=Guardian Care Pro
LOGO_URL=https://via.placeholder.com/200x80/FFFFFF/0D2BEC?text=Logo
```

### Production Setup

```env
# Use real, optimized images from CDN
EMAIL_BANNER=https://cdn.yourcompany.com/emails/banner-v2.jpg
LOGO_URL=https://cdn.yourcompany.com/emails/logo-2024.png
```

## Security Considerations

1. **Public Access**: Email images MUST be publicly accessible
2. **No Sensitive Data**: Don't include sensitive info in images
3. **HTTPS Only**: Always use secure URLs
4. **CDN Headers**: Set appropriate cache headers
5. **Access Logs**: Monitor for unusual access patterns

## Cost Considerations

### Cloudinary Free Tier
- 25 GB storage
- 25 GB bandwidth/month
- Usually sufficient for email templates

### AWS S3 Pricing
- First 5 GB storage: Free (12 months)
- GET requests: $0.0004 per 1,000
- Data transfer: $0.09/GB

### Bandwidth Estimate

For 1,000 emails/month:
- Banner (150KB) + Logo (30KB) = 180KB per email
- Monthly: 180KB × 1,000 = 180 MB
- Cost: Minimal (< $1/month on most CDNs)

## Maintenance

### Regular Updates

- Review images quarterly
- Update for rebranding
- Optimize file sizes as needed
- Test across email clients after changes

### Version Control

Use versioned URLs for easy rollback:

```env
# Good - versioned
EMAIL_BANNER=https://cdn.example.com/emails/banner-v2.jpg

# Bad - no version
EMAIL_BANNER=https://cdn.example.com/emails/banner.jpg
```

---

**Need Help?**
- Check main documentation: `docs/email-template-usage.md`
- Quick reference: `docs/email-template-quick-reference.md`
- Contact development team for assistance

