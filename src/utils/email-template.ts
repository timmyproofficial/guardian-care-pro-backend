// src/utils/emailTemplate.ts

import config from '../config/env'

interface EmailTemplateOptions {
    preheader?: string;
    contentTitle?: string;
    greeting?: string;
    recipientName?: string;
    mainContent: string;
    footerText?: string;
    showDashboardButton?: boolean;
    dashboardUrl?: string;
    unsubscribeUrl?: string;
    bannerImageUrl?: string;
  }
  
  export const generateEmailTemplate = (options: EmailTemplateOptions): string => {
    const {
      preheader = 'Support24 - Professional Care Services',
      contentTitle = '',
      greeting = 'Hello',
      recipientName = 'there',
      mainContent,
    //   showDashboardButton = true,
    //   dashboardUrl = '',
    //   unsubscribeUrl = '',
      bannerImageUrl = 'https://asset.cloudinary.com/dj8g798ed/1d70f4e84be394b93e812f9953037fd3',
    } = options;

    const bannerUrl = bannerImageUrl || config.assets.emailBanner;
  
    return `
  <!DOCTYPE html>
  <html lang="en">
 <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <title>${contentTitle || 'Support24'}</title>
    
    <!-- Preheader text (hidden but shown in email previews) -->
    <div style="display: none; max-height: 0px; overflow: hidden;">
      ${preheader}
    </div>
    
    <!--[if mso]>
    <style type="text/css">
      .email-container {width: 770px !important;}
    </style>
    <![endif]-->
    
    <style>
      html {
  font-family: "Montserrat", sans-serif;
  font-optical-sizing: auto;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* Email Container */
.email-container {
  width: 770px;
  background-color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Header Section */
.email-header {
  width: 100%;
  height: 219px;
  overflow: hidden;
  flex: none;
  order: 0;
  align-self: stretch;
  flex-grow: 0;
}

.banner-img {
  width: 100%;
  height: 100%;
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
  margin-bottom: 20px;
}

.body-text {
  font-size: 18px;
  font-weight: 400;
  color: #000000;
  line-height: 1.6;
  margin-bottom: 30px;
}

/* Organization Details Box */
.org-details-box {
  background: #F7F7F7;
  border-left: 5px solid #0D2BEC;
  border-radius: 15px;
  padding: 25px 30px;
  margin-bottom: 30px;
}

.org-details-title {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 20px;
}

.org-details-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
}

.detail-label {
  font-weight: 400;
  color: #000000;
}

.detail-value {
  font-weight: 600;
  color: #000000;
  text-align: right;
}

/* CTA Button */
.cta-button {
  display: inline-block;
  background-color: #0D2BEC;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  padding: 15px 35px;
  border-radius: 8px;
  text-decoration: none;
  margin-bottom: 20px;
  transition: background-color 0.3s ease;
}

.cta-button:hover {
  background-color: #0a22c7;
}

/* Tagline */
.tagline {
  font-size: 18px;
  font-weight: 400;
  color: #000000;
  font-style: italic;
  margin-bottom: 30px;
}

/* Sign-off */
.sign-off {
  font-size: 18px;
  font-weight: 400;
  color: #000000;
  line-height: 1.6;
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
  margin-bottom: 8px;
}

.footer-text-secondary {
  font-size: 18px;
  font-weight: 400;
  color: #ffffff;
  margin-bottom: 20px;
}

/* Social Icons */
.social-icons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.social-link {
  display: inline-block;
  width: 40px;
  height: 40px;
  background-color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.social-link:hover {
  transform: scale(1.1);
}

.social-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}
      
      
      
      /* Responsive */
      @media screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .button { width: 100%; padding: 16px 0; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <center class="email-container">
        
        <!-- Email Header with Logo -->
        <header class="email-header">
            <img src=${bannerUrl} alt="Support24 Banner" class="banner-img">
        </header>
        
        <!-- Email Content -->
        <main class="email-content">
            <p class="greeting"><strong>${greeting} ${recipientName} 👋,</strong></p>
            
            <p class="body-text">
                ${mainContent}
            </p>

            <!-- Tagline -->
            <p class="tagline">Let's build a healthier workplace or community together</p>

            <!-- Sign-off -->
            <p class="sign-off">Best Regards<br>Support24 Team</p>
        </main>
        
        <!-- Email Footer -->
        <footer class="email-footer">
            <p class="footer-text-primary">© 2025 Support24. All rights reserved.</p>
            <p class="footer-text-secondary">Connecting organizations with trusted allied health professionals</p>
            
            <div class="social-icons">
                // <a href="#" class="social-link">
                //     <img src="./assets/facebook.png" alt="Facebook" class="social-icon">
                // </a>
                // <a href="#" class="social-link">
                //     <img src="./assets/ig.png" alt="Instagram" class="social-icon">
                // </a>
                // <a href="#" class="social-link">
                //     <img src="./assets/linkedin.png" alt="LinkedIn" class="social-icon">
                // </a>
            </div>
        </footer>
        
    </div>
  </body>
  </html>
    `;
  };