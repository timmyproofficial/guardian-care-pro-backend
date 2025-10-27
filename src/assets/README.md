# Email Assets Directory

## 📁 Purpose

This directory stores images used in email templates. Images placed here will be automatically encoded to base64 and embedded directly in emails for maximum reliability.

## 🖼️ Required Files

### 1. Email Banner (Required)

**Filename:** `email-banner.png`

**Specifications:**
- **Dimensions:** 770px × 219px
- **Format:** PNG or JPG
- **File Size:** < 150KB (recommended)
- **Content:** Your company logo/branding on a professional background

**Place your banner here:**
```
src/assets/email-banner.png
```

### 2. Logo (Optional)

**Filename:** `logo.png`

**Specifications:**
- **Width:** 200px
- **Format:** PNG (transparent background recommended)
- **File Size:** < 30KB
- **Content:** Company logo

**If you want to use it:**
```
src/assets/logo.png
```

Then add to `.env`:
```env
LOGO_LOCAL=src/assets/logo.png
```

## ⚙️ Configuration

After adding your images, update your `.env` file:

```env
# Required
EMAIL_BANNER_LOCAL=src/assets/email-banner.png

# Enable base64 encoding (recommended)
USE_BASE64_IMAGES=true

# Optional logo
LOGO_LOCAL=src/assets/logo.png
```

## 🔄 How It Works

1. **On startup:** Application reads images from this directory
2. **Encoding:** Converts images to base64 data URIs
3. **Caching:** Stores encoded images in memory
4. **Usage:** Embeds images directly in all outgoing emails

## 📝 Image Guidelines

### Optimization Tips

**Before adding your images, optimize them:**

```bash
# Using online tools (easiest)
# Visit: tinypng.com or squoosh.app

# Using ImageMagick (command line)
convert input.png -resize 770x219 -quality 85 email-banner.png

# Using pngquant (for PNG files)
pngquant email-banner.png --output email-banner-optimized.png
```

### Design Recommendations

**Banner Image:**
- Use high-contrast colors
- Ensure logo is clearly visible
- Avoid small text (may be cut off on mobile)
- Test on both light and dark backgrounds
- Consider gradient or solid color background

**Logo Image:**
- Use transparent background (PNG)
- Ensure good contrast with white background
- Keep it simple and recognizable
- Test at actual size (200px wide)

## 🎨 Example Structure

```
src/assets/
├── README.md              ← This file
├── email-banner.png       ← Your main banner (770x219px)
├── logo.png               ← Your logo (200px wide) - optional
└── .gitkeep               ← Keeps directory in git
```

## 🚀 Quick Start

1. **Add your banner image:**
   ```bash
   cp ~/Downloads/banner.png src/assets/email-banner.png
   ```

2. **Update .env:**
   ```bash
   echo "EMAIL_BANNER_LOCAL=src/assets/email-banner.png" >> .env
   echo "USE_BASE64_IMAGES=true" >> .env
   ```

3. **Rebuild and restart:**
   ```bash
   npm run build
   npm start
   ```

4. **Test:** Send a test email and verify banner displays!

## 📊 File Size Impact

| Image | Recommended Size | Impact on Email |
|-------|-----------------|-----------------|
| Banner (PNG) | < 150KB | Email: ~200KB |
| Banner (JPG) | < 100KB | Email: ~150KB |
| Logo (PNG) | < 30KB | Email: ~50KB |

**Note:** Base64 encoding increases size by ~33%, but ensures images always display.

## 🔄 Updating Images

To update an image:

1. Replace the file in this directory
2. Restart the application (cache will clear automatically)
3. New emails will use the updated image

## ⚠️ Important Notes

- **Do not remove this directory** - It's required for email functionality
- **Commit images to git** - They need to be on the server
- **Test locally first** - Verify images before deploying
- **Keep backups** - Save original high-res versions elsewhere

## 🐛 Troubleshooting

**"Image not found" error:**
- Check file path is correct: `src/assets/email-banner.png`
- Verify file exists: `ls src/assets/`
- Check file permissions

**"File too large" warning:**
- Optimize image to < 150KB
- Use JPG instead of PNG if transparency not needed
- Reduce dimensions if necessary

**Image looks pixelated:**
- Use higher quality source image
- Export at 2x resolution then resize
- Ensure using correct dimensions (770x219px)

## 📚 Documentation

For more details, see:
- [Email Image Setup Guide](../../docs/email-image-setup-guide.md)
- [Email Template Usage](../../docs/email-template-usage.md)

## ✅ Checklist

Before deploying:

- [ ] Banner image added to this directory
- [ ] Image optimized (< 150KB)
- [ ] Image dimensions correct (770x219px)
- [ ] .env file updated
- [ ] Application tested locally
- [ ] Test email sent and verified
- [ ] Image displays correctly in Gmail
- [ ] Image displays correctly in Outlook
- [ ] Image displays correctly on mobile

---

**Need help?** Contact the development team or check the documentation!

