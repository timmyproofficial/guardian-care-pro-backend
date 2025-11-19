/**
 * Environment configuration
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment variable validation schema
 */
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    API_PREFIX: Joi.string().default('/api/v1'),
    CLIENT_URL: Joi.string().required().description('Client application URL'),
    CORS_ORIGIN: Joi.string().default('*'),
    
    // MongoDB
    MONGODB_URI: Joi.string().required().description('MongoDB connection string'),
    MONGODB_URI_TEST: Joi.string().description('MongoDB connection string for testing'),
    
    // JWT
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('JWT access token expiration in minutes'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('JWT refresh token expiration in days'),
    
    // Logging
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
    
    // Email
    EMAIL_FROM: Joi.string().description('Email sender address'),
    SMTP_HOST: Joi.string().description('SMTP host'),
    SMTP_PORT: Joi.number().description('SMTP port'),
    SMTP_USERNAME: Joi.string().description('SMTP username'),
    SMTP_PASSWORD: Joi.string().description('SMTP password'),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: Joi.string().required().description('Cloudinary cloud name'),
    CLOUDINARY_API_KEY: Joi.string().required().description('Cloudinary API key'),
    CLOUDINARY_API_SECRET: Joi.string().required().description('Cloudinary API secret'),
    
    // Email Assets
    EMAIL_BANNER: Joi.string().description('Email banner image URL'),
    LOGO_URL: Joi.string().description('Company logo URL for emails'),
    FACEBOOK_ICON_URL: Joi.string().description('Facebook icon URL for email footer'),
    INSTAGRAM_ICON_URL: Joi.string().description('Instagram icon URL for email footer'),
    LINKEDIN_ICON_URL: Joi.string().description('LinkedIn icon URL for email footer'),
    FACEBOOK_URL: Joi.string().description('Facebook profile/page URL'),
    INSTAGRAM_URL: Joi.string().description('Instagram profile URL'),
    LINKEDIN_URL: Joi.string().description('LinkedIn company page URL'),
    
    // Storage (AWS S3)
    AWS_BUCKET_NAME: Joi.string().description('AWS S3 bucket name'),
    AWS_ACCESS_KEY_ID: Joi.string().description('AWS access key ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('AWS secret access key'),
    AWS_REGION: Joi.string().description('AWS region'),
    
    // Stripe (Payment Processing)
    STRIPE_SECRET_KEY: Joi.string().description('Stripe secret key'),
    STRIPE_WEBHOOK_SECRET: Joi.string().description('Stripe webhook secret'),
    
    // Firebase (Push Notifications)
    FIREBASE_PROJECT_ID: Joi.string().description('Firebase project ID'),
    FIREBASE_PRIVATE_KEY: Joi.string().description('Firebase private key'),
    FIREBASE_CLIENT_EMAIL: Joi.string().description('Firebase client email'),
    
    // Local image paths for email (optional)
    EMAIL_BANNER_LOCAL: Joi.string().description('Local path to email banner image'),
    LOGO_LOCAL: Joi.string().description('Local path to logo image'),
    USE_BASE64_IMAGES: Joi.string().description('Use base64 encoding for email images (true/false)')
  })
  .unknown();

// Validate environment variables
const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

/**
 * Configuration object
 */
const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  apiPrefix: envVars.API_PREFIX,
  clientUrl: envVars.CLIENT_URL,
  corsOrigin: envVars.CORS_ORIGIN,
  
  // MongoDB config
  mongoose: {
    url: envVars.NODE_ENV === 'test' ? envVars.MONGODB_URI_TEST : envVars.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  // JWT config
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  
  // Email config
  email: {
    from: envVars.EMAIL_FROM,
    smtp: {
      host: envVars.SMTP_HOST,
      port: Number(envVars.SMTP_PORT),
      // secure: Number(envVars.SMTP_PORT) === 587,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Prevents GoDaddy SSL issues
      },
    },
  },

  // email: {
  //   from: 'support@support24.com.au',
  //   smtp: {
  //     host: 'mail.support24.com.au',
  //     port: Number(465),
  //     secure: Number(465) === 465,
  //     auth: {
  //       user: 'support@support24.com.au',
  //       pass: 'U6%6U*]X-7h5',
  //     },
  //     tls: {
  //       rejectUnauthorized: false, // Prevents GoDaddy SSL issues
  //     },
  //   },
  // },

  // Cloudinary config
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },

  // Assets config
  assets: {
    // Email banner - can be URL or local path (local will be base64 encoded)
    emailBanner: envVars.EMAIL_BANNER || 'https://res.cloudinary.com/dj8g798ed/image/upload/v1761266846/Frame_2147224087_eylrev.png',
    emailBannerLocal: envVars.EMAIL_BANNER_LOCAL || '', // Local path: 'src/assets/email-banner.png'
    
    // Logo - can be URL or local path
    logo: envVars.LOGO_URL || 'https://res.cloudinary.com/dj8g798ed/image/upload/v1/email-assets/logo.png',
    logoLocal: envVars.LOGO_LOCAL || '', // Local path: 'src/assets/logo.png'
    
    // Use base64 encoding for images (more reliable in emails)
    useBase64Images: envVars.USE_BASE64_IMAGES === 'true' || true,
    
    socialIcons: {
      facebook: envVars.FACEBOOK_ICON_URL || 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
      instagram: envVars.INSTAGRAM_ICON_URL || 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png',
      linkedin: envVars.LINKEDIN_ICON_URL || 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
    },
    socialLinks: {
      facebook: envVars.FACEBOOK_URL || '#',
      instagram: envVars.INSTAGRAM_URL || '#',
      linkedin: envVars.LINKEDIN_URL || '#',
    }
  },
  
  // AWS S3 config
  aws: {
    bucketName: envVars.AWS_BUCKET_NAME,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
  },
  
  // Stripe config
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  },
  
  // Firebase config (Push Notifications)
  firebase: {
    projectId: envVars.FIREBASE_PROJECT_ID || '',
    privateKey: envVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: envVars.FIREBASE_CLIENT_EMAIL || '',
  },
  
  // Logging config
  logLevel: envVars.LOG_LEVEL,
};

export default config;