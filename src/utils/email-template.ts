/**
 * Email Template Utilities
 * Reusable email template with consistent header, footer, and flexible body content
 */

import config from '../config/env';

/**
 * Email template options interface
 */
interface EmailTemplateOptions {
  preheader?: string;
  greeting?: string;
  recipientName?: string;
  bodyContent: string;
  showButton?: boolean;
  buttonText?: string;
  buttonUrl?: string;
  includeTagline?: boolean;
  customBannerUrl?: string;
}

/**
 * Detail row for info boxes
 */
interface DetailRow {
  label: string;
  value: string;
}

/**
 * Generate the main email template with reusable header and footer
 */
export const generateEmailTemplate = (options: EmailTemplateOptions): string => {
  const {
    preheader = 'Support24 - Professional Care Services',
    greeting = 'Dear',
    recipientName = 'there',
    bodyContent,
    showButton = false,
    buttonText = 'View Dashboard',
    buttonUrl = config.clientUrl + '/dashboard',
    includeTagline = true,
    customBannerUrl = '',
  } = options;

  const bannerUrl = customBannerUrl || config.assets.emailBanner;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <title>Support24</title>
  
  <!-- Preheader text (hidden but shown in email previews) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>
  
  <!--[if mso]>
  <style type="text/css">
    .email-container {width: 770px !important;}
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
  
  <style>
    /* Reset styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, table, td, a {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table {
      border-collapse: collapse !important;
    }
    
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    
    /* Base styles */
    html {
      font-family: "Montserrat", "Segoe UI", Arial, sans-serif;
      font-optical-sizing: auto;
    }
    
    body {
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    
    /* Email Container */
    .email-container {
      max-width: 770px;
      width: 100%;
      background-color: #ffffff;
      margin: 0 auto;
    }
    
    /* Header Section */
    .email-header {
      width: 100%;
      height: 219px;
      background-color: #050F53;
    }
    
    .banner-img {
      width: 100%;
      height: 219px;
      object-fit: cover;
      display: block;
    }
    
    /* Main Content Section */
    .email-content {
      padding: 40px 50px;
      background-color: #ffffff;
    }
    
    .greeting {
      font-size: 21px;
      font-weight: 700;
      color: #000000;
      margin: 0 0 20px 0;
      line-height: 1.4;
    }
    
    .body-text {
      font-size: 18px;
      font-weight: 400;
      color: #000000;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    
    /* Info/Details Box */
    .info-box {
      background: #F7F7F7;
      border-left: 5px solid #0D2BEC;
      border-radius: 15px;
      padding: 25px 30px;
      margin: 20px 0;
    }
    
    .info-box-title {
      font-size: 18px;
      font-weight: 600;
      color: #000000;
      margin: 0 0 20px 0;
    }
    
    .detail-row {
      display: table;
      width: 100%;
      margin: 10px 0;
    }
    
    .detail-label {
      display: table-cell;
      font-size: 18px;
      font-weight: 400;
      color: #000000;
      width: 50%;
    }
    
    .detail-value {
      display: table-cell;
      font-size: 18px;
      font-weight: 600;
      color: #000000;
      text-align: right;
      width: 50%;
    }
    
    /* Code/OTP Box */
    .code-box {
      background-color: #f5f5f5;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      border-radius: 8px;
      color: #2c3e50;
      border: 2px dashed #0D2BEC;
    }
    
    /* CTA Button */
    .cta-button {
      display: inline-block;
      background-color: #0D2BEC;
      color: #ffffff !important;
      font-size: 18px;
      font-weight: 600;
      padding: 15px 35px;
      border-radius: 8px;
      text-decoration: none;
      margin: 20px 0;
      text-align: center;
    }
    
    .cta-button:hover {
      background-color: #0a22c7;
    }
    
    .button-container {
      text-align: center;
      margin: 20px 0;
    }
    
    /* Tagline */
    .tagline {
      font-size: 18px;
      font-weight: 400;
      color: #000000;
      font-style: italic;
      margin: 30px 0 20px 0;
      line-height: 1.6;
    }
    
    /* Sign-off */
    .sign-off {
      font-size: 18px;
      font-weight: 400;
      color: #000000;
      line-height: 1.6;
      margin: 20px 0 0 0;
    }
    
    /* Footer Section */
    .email-footer {
      background: #050F53;
      padding: 30px 50px;
      text-align: center;
    }
    
    .footer-text-primary {
      font-size: 18px;
      font-weight: 400;
      color: #ffffff;
      margin: 0 0 8px 0;
    }
    
    .footer-text-secondary {
      font-size: 18px;
      font-weight: 400;
      color: #ffffff;
      margin: 0 0 20px 0;
    }
    
    /* Social Icons */
    .social-icons {
      text-align: center;
      margin: 20px 0 0 0;
    }
    
    .social-link {
      display: inline-block;
      width: 40px;
      height: 40px;
      background-color: #ffffff;
      border-radius: 50%;
      margin: 0 10px;
      vertical-align: middle;
      text-align: center;
      line-height: 40px;
    }
    
    .social-icon {
      width: 20px;
      height: 20px;
      vertical-align: middle;
      display: inline-block;
    }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      
      .email-content {
        padding: 30px 20px !important;
      }
      
      .email-footer {
        padding: 20px 15px !important;
      }
      
      .greeting {
        font-size: 19px !important;
      }
      
      .body-text {
        font-size: 16px !important;
      }
      
      .info-box {
        padding: 20px !important;
      }
      
      .detail-label,
      .detail-value {
        font-size: 16px !important;
      }
      
      .cta-button {
        padding: 12px 25px !important;
        font-size: 16px !important;
        display: block !important;
        width: 100% !important;
      }
      
      .code-box {
        font-size: 24px !important;
        letter-spacing: 5px !important;
        padding: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container" style="max-width: 770px; width: 100%; background-color: #ffffff;">
          
          <!-- Email Header with Banner -->
          <tr>
            <td class="email-header" style="padding: 0;">
              <img src="${bannerUrl}" alt="Support24" class="banner-img" style="width: 100%; height: 219px; display: block; border: 0;">
            </td>
          </tr>
          
          <!-- Email Content -->
          <tr>
            <td class="email-content" style="padding: 40px 50px; background-color: #ffffff;">
              
              <!-- Greeting -->
              <p class="greeting" style="font-size: 21px; font-weight: 700; color: #000000; margin: 0 0 20px 0;">
                ${greeting} ${recipientName} 👋
              </p>
              
              <!-- Body Content -->
              ${bodyContent}
              
              ${showButton ? `
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td class="button-container" align="center">
                    <a href="${buttonUrl}" class="cta-button" style="display: inline-block; background-color: #0D2BEC; color: #ffffff; font-size: 18px; font-weight: 600; padding: 15px 35px; border-radius: 8px; text-decoration: none;">${buttonText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              ${includeTagline ? `
              <!-- Tagline -->
              <p class="tagline" style="font-size: 18px; font-weight: 400; color: #000000; font-style: italic; margin: 30px 0 20px 0;">
                Let's build a healthier workplace or community together
              </p>
              ` : ''}
              
              <!-- Sign-off -->
              <p class="sign-off" style="font-size: 18px; font-weight: 400; color: #000000; line-height: 1.6; margin: 20px 0 0 0;">
                <strong>Best Regards</strong><br>
                <strong>Support24 Team</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Email Footer -->
          <tr>
            <td class="email-footer" style="background: #050F53; padding: 30px 50px; text-align: center;">
              
              <p class="footer-text-primary" style="font-size: 18px; font-weight: 400; color: #ffffff; margin: 0 0 8px 0;">
                © 2025 Support24. All rights reserved.
              </p>
              
              <p class="footer-text-secondary" style="font-size: 18px; font-weight: 400; color: #ffffff; margin: 0 0 20px 0;">
                Connecting organizations with trusted allied health professionals
              </p>
              
              <!-- Social Icons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" class="social-icons" style="margin: 20px auto 0;">
                <tr>
                  <td>
                    <a href="${config.assets.socialLinks.facebook}" class="social-link" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-align: center; line-height: 40px; margin: 0 10px;">
                      <img src="${config.assets.socialIcons.facebook}" alt="Facebook" class="social-icon" style="width: 20px; height: 20px; vertical-align: middle; border: 0;">
                    </a>
                  </td>
                  <td>
                    <a href="${config.assets.socialLinks.instagram}" class="social-link" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-align: center; line-height: 40px; margin: 0 10px;">
                      <img src="${config.assets.socialIcons.instagram}" alt="Instagram" class="social-icon" style="width: 20px; height: 20px; vertical-align: middle; border: 0;">
                    </a>
                  </td>
                  <td>
                    <a href="${config.assets.socialLinks.linkedin}" class="social-link" style="display: inline-block; width: 40px; height: 40px; background-color: #ffffff; border-radius: 50%; text-align: center; line-height: 40px; margin: 0 10px;">
                      <img src="${config.assets.socialIcons.linkedin}" alt="LinkedIn" class="social-icon" style="width: 20px; height: 20px; vertical-align: middle; border: 0;">
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Helper: Create an info/details box (like organization details)
 */
export const createInfoBox = (title: string, details: DetailRow[]): string => {
  const detailRows = details
    .map(
      (detail) => `
    <div class="detail-row" style="margin: 10px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td class="detail-label" style="font-size: 18px; font-weight: 400; color: #000000; width: 50%;">
            ${detail.label}
          </td>
          <td class="detail-value" style="font-size: 18px; font-weight: 600; color: #000000; text-align: right; width: 50%;">
            ${detail.value}
          </td>
        </tr>
      </table>
    </div>
  `
    )
    .join('');

  return `
    <div class="info-box" style="background: #F7F7F7; border-left: 5px solid #0D2BEC; border-radius: 15px; padding: 25px 30px; margin: 20px 0;">
      <p class="info-box-title" style="font-size: 18px; font-weight: 600; color: #000000; margin: 0 0 20px 0;">
        ${title}
      </p>
      ${detailRows}
    </div>
  `;
};

/**
 * Helper: Create a code/OTP display box
 */
export const createCodeBox = (code: string): string => {
  return `
    <div class="code-box" style="background-color: #f5f5f5; padding: 20px; margin: 24px 0; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; color: #2c3e50; border: 2px dashed #0D2BEC;">
      ${code}
    </div>
  `;
};

/**
 * Helper: Create a simple paragraph
 */
export const createParagraph = (text: string): string => {
  return `
    <p class="body-text" style="font-size: 18px; font-weight: 400; color: #000000; line-height: 1.6; margin: 0 0 20px 0;">
      ${text}
    </p>
  `;
};

/**
 * Helper: Create a list
 */
export const createList = (items: string[], ordered: boolean = false): string => {
  const listItems = items
    .map((item) => `<li style="margin: 8px 0;">${item}</li>`)
    .join('');
  const listTag = ordered ? 'ol' : 'ul';

  return `
    <${listTag} style="font-size: 18px; font-weight: 400; color: #000000; line-height: 1.6; margin: 0 0 20px 0; padding-left: 25px;">
      ${listItems}
    </${listTag}>
  `;
};

/**
 * Helper: Create an alert/warning box
 */
export const createAlertBox = (message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info'): string => {
  const colors = {
    info: '#0D2BEC',
    warning: '#FFA500',
    success: '#28a745',
    error: '#dc3545',
  };

  return `
    <div style="background: ${colors[type]}15; border-left: 5px solid ${colors[type]}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="font-size: 18px; font-weight: 500; color: #000000; margin: 0; line-height: 1.6;">
        ${message}
      </p>
    </div>
  `;
};
