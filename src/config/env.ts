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
    PORT: Joi.number().default(5000),
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
    
    // Storage (AWS S3)
    AWS_BUCKET_NAME: Joi.string().description('AWS S3 bucket name'),
    AWS_ACCESS_KEY_ID: Joi.string().description('AWS access key ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('AWS secret access key'),
    AWS_REGION: Joi.string().description('AWS region'),
    
    // Stripe (Payment Processing)
    STRIPE_SECRET_KEY: Joi.string().description('Stripe secret key'),
    STRIPE_WEBHOOK_SECRET: Joi.string().description('Stripe webhook secret')
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
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
  },

  // Cloudinary config
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
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
  
  // Logging config
  logLevel: envVars.LOG_LEVEL,
};

export default config;