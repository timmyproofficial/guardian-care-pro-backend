#!/usr/bin/env node
/**
 * Generate Postman Collection from OpenAPI/Swagger Specification
 * 
 * Usage: npm run generate:postman
 */

const fs = require('fs');
const path = require('path');
const Converter = require('openapi-to-postmanv2');

// Import the swagger spec (need to use require for CJS compatibility)
const generateSwaggerSpec = () => {
  // This is a workaround since we can't directly import TS in node script
  // Instead, we'll read the generated swagger JSON from the API
  console.log('📝 Generating Postman collection from OpenAPI specification...\n');
  
  // Read swagger config to generate spec
  const swaggerJsdoc = require('swagger-jsdoc');
  const packageJson = require('../package.json');
  
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Guardian Care Pro API',
        version: packageJson.version,
        description: 'Backend API for Support24 - A platform connecting Independent Support Workers with participants and their guardians',
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server',
        },
        {
          url: 'https://your-production-url.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts'],
  };
  
  return swaggerJsdoc(swaggerOptions);
};

const convertToPostman = () => {
  try {
    const swaggerSpec = generateSwaggerSpec();
    
    // Save OpenAPI spec
    const openapiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
    fs.mkdirSync(path.dirname(openapiPath), { recursive: true });
    fs.writeFileSync(openapiPath, JSON.stringify(swaggerSpec, null, 2));
    console.log('✅ OpenAPI specification saved to:', openapiPath);
    
    // Convert to Postman Collection
    Converter.convert(
      { type: 'json', data: swaggerSpec },
      {
        folderStrategy: 'Tags',
        requestParametersResolution: 'Schema',
        exampleParametersResolution: 'Schema',
        optimizeConversion: true,
        stackLimit: 50,
      },
      (err, conversionResult) => {
        if (err) {
          console.error('❌ Error converting to Postman:', err);
          process.exit(1);
        }
        
        if (!conversionResult.result) {
          console.error('❌ Conversion failed:', conversionResult.reason);
          process.exit(1);
        }
        
        const postmanCollection = conversionResult.output[0].data;
        
        // Save Postman collection
        const collectionPath = path.join(__dirname, '..', 'docs', 'postman-collection.json');
        fs.writeFileSync(collectionPath, JSON.stringify(postmanCollection, null, 2));
        console.log('✅ Postman collection saved to:', collectionPath);
        
        console.log('\n🎉 Documentation generation complete!');
        console.log('\n📚 Next steps:');
        console.log('   1. View Swagger docs at: http://localhost:5000/api-docs');
        console.log('   2. Import postman-collection.json into Postman');
        console.log('   3. Set up environment variables in Postman for auth tokens\n');
      }
    );
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
};

// Run the conversion
convertToPostman();
