#!/usr/bin/env ts-node
/**
 * Migrate Route Documentation to Swagger
 * 
 * This script scans all route files and converts old-style comments
 * (@route, @desc, @access) to Swagger/OpenAPI annotations (@swagger)
 * 
 * Usage:
 *   npm run migrate:swagger        # Dry run (preview changes)
 *   npm run migrate:swagger --write # Write changes to files
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteInfo {
  method: string;
  path: string;
  description: string;
  access: string;
  queries?: string[];
  body?: string;
  example?: string;
  file: string;
  startLine: number;
  routeLine: string;
}

const ROUTE_TAGS_MAP: Record<string, string> = {
  'auth.route.ts': 'Authentication',
  'user.route.ts': 'Users',
  'worker.route.ts': 'Workers',
  'job.route.ts': 'Jobs',
  'shift.route.ts': 'Shifts',
  'timesheet.route.ts': 'Timesheets',
  'invoice.route.ts': 'Invoices',
  'batchInvoice.route.ts': 'Batch Invoices',
  'organization.route.ts': 'Organizations',
  'location.route.ts': 'Locations',
  'analytics.route.ts': 'Analytics',
  'chat.route.ts': 'Chat',
  'event.route.ts': 'Events',
  'incident.route.ts': 'Incidents',
  'notification.routes.ts': 'Notifications',
  'public.route.ts': 'Public',
  'serviceType.route.ts': 'Service Types',
  'serviceCategory.route.ts': 'Service Categories',
  'admin-user.route.ts': 'Admin',
  'rateTimeBand.route.ts': 'Rate Time Bands',
  'roster.route.ts': 'Roster',
  'routine.route.ts': 'Routines',
};

class SwaggerMigrator {
  private routesDir: string;
  private writeMode: boolean;

  constructor(routesDir: string, writeMode: boolean = false) {
    this.routesDir = routesDir;
    this.writeMode = writeMode;
  }

  /**
   * Parse route file and extract route information
   */
  private parseRouteFile(filePath: string): RouteInfo[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const routes: RouteInfo[] = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Look for old-style route comments
      if (line.startsWith('/**') || line.startsWith('/*')) {
        const commentBlock: string[] = [];
        const startLine = i;
        
        // Collect comment block
        while (i < lines.length && !lines[i].trim().endsWith('*/')) {
          commentBlock.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          commentBlock.push(lines[i]);
          i++;
        }
        
        // Check if this is a route comment
        const commentText = commentBlock.join('\n');
        const routeMatch = commentText.match(/@route\s+(\w+)\s+([^\s]+)/);
        const descMatch = commentText.match(/@desc\s+(.+?)(?=\*|@|$)/s);
        const accessMatch = commentText.match(/@access\s+(\w+)/);
        const queryMatch = commentText.match(/@query\s+(.+?)(?=\*|@|$)/s);
        const bodyMatch = commentText.match(/@body\s+(.+?)(?=\*|@|$)/s);
        const exampleMatch = commentText.match(/@example\s+(.+?)(?=\*|@|$)/s);
        
        if (routeMatch) {
          // Find the actual router line
          let routeLine = '';
          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('router.') || lines[j].includes('Router.')) {
              routeLine = lines[j];
              break;
            }
          }
          
          routes.push({
            method: routeMatch[1].toUpperCase(),
            path: routeMatch[2],
            description: descMatch ? descMatch[1].trim().replace(/\*/g, '').trim() : '',
            access: accessMatch ? accessMatch[1] : 'Public',
            queries: queryMatch ? [queryMatch[1].trim().replace(/\*/g, '').trim()] : undefined,
            body: bodyMatch ? bodyMatch[1].trim().replace(/\*/g, '').trim() : undefined,
            example: exampleMatch ? exampleMatch[1].trim().replace(/\*/g, '').trim() : undefined,
            file: path.basename(filePath),
            startLine,
            routeLine,
          });
        }
      }
      i++;
    }
    
    return routes;
  }

  /**
   * Generate Swagger annotation from route info
   */
  private generateSwaggerAnnotation(route: RouteInfo, tag: string): string {
    const isPublic = route.access.toLowerCase().includes('public') || 
                     route.access.toLowerCase().includes('no auth');
    
    const pathParams = this.extractPathParams(route.path);
    const hasAuth = !isPublic;
    
    let swagger = `/**\n`;
    swagger += ` * @swagger\n`;
    swagger += ` * ${route.path}:\n`;
    swagger += ` *   ${route.method.toLowerCase()}:\n`;
    swagger += ` *     summary: ${route.description || 'Endpoint description'}\n`;
    swagger += ` *     description: ${route.description || 'Detailed endpoint description'}\n`;
    swagger += ` *     tags: [${tag}]\n`;
    
    if (hasAuth) {
      swagger += ` *     security:\n`;
      swagger += ` *       - bearerAuth: []\n`;
    } else {
      swagger += ` *     security: []\n`;
    }
    
    // Add parameters
    if (pathParams.length > 0 || route.queries) {
      swagger += ` *     parameters:\n`;
      
      // Path parameters
      pathParams.forEach(param => {
        swagger += ` *       - in: path\n`;
        swagger += ` *         name: ${param}\n`;
        swagger += ` *         required: true\n`;
        swagger += ` *         schema:\n`;
        swagger += ` *           type: string\n`;
        swagger += ` *         description: The ${param}\n`;
      });
      
      // Query parameters
      if (route.queries) {
        route.queries.forEach(query => {
          const queryParams = this.parseQueryParams(query);
          queryParams.forEach(qp => {
            swagger += ` *       - in: query\n`;
            swagger += ` *         name: ${qp.name}\n`;
            if (qp.required) swagger += ` *         required: true\n`;
            swagger += ` *         schema:\n`;
            swagger += ` *           type: ${qp.type || 'string'}\n`;
            if (qp.description) swagger += ` *         description: ${qp.description}\n`;
          });
        });
      }
    }
    
    // Add request body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(route.method) && !route.path.includes('upload')) {
      swagger += ` *     requestBody:\n`;
      swagger += ` *       required: true\n`;
      swagger += ` *       content:\n`;
      swagger += ` *         application/json:\n`;
      swagger += ` *           schema:\n`;
      swagger += ` *             type: object\n`;
      
      if (route.body) {
        swagger += ` *             description: ${route.body}\n`;
      }
    }
    
    // Add responses
    swagger += ` *     responses:\n`;
    
    if (route.method === 'GET') {
      swagger += ` *       200:\n`;
      swagger += ` *         description: Successfully retrieved data\n`;
    } else if (route.method === 'POST') {
      swagger += ` *       201:\n`;
      swagger += ` *         description: Successfully created\n`;
    } else if (route.method === 'DELETE') {
      swagger += ` *       200:\n`;
      swagger += ` *         description: Successfully deleted\n`;
    } else {
      swagger += ` *       200:\n`;
      swagger += ` *         description: Successfully updated\n`;
    }
    
    if (!isPublic) {
      swagger += ` *       401:\n`;
      swagger += ` *         description: Unauthorized\n`;
    }
    
    if (pathParams.length > 0) {
      swagger += ` *       404:\n`;
      swagger += ` *         description: Resource not found\n`;
    }
    
    swagger += ` */`;
    
    return swagger;
  }

  /**
   * Extract path parameters from route path
   */
  private extractPathParams(path: string): string[] {
    const params: string[] = [];
    const matches = path.matchAll(/:(\w+)/g);
    for (const match of matches) {
      params.push(match[1]);
    }
    return params;
  }

  /**
   * Parse query parameters from query description
   */
  private parseQueryParams(queryStr: string): Array<{name: string, type?: string, description?: string, required?: boolean}> {
    const params: Array<{name: string, type?: string, description?: string, required?: boolean}> = [];
    
    // Simple parsing - can be enhanced
    const parts = queryStr.split(',');
    parts.forEach(part => {
      const trimmed = part.trim();
      const nameMatch = trimmed.match(/(\w+)(?:\[\])?/);
      if (nameMatch) {
        params.push({
          name: nameMatch[1],
          type: trimmed.includes('[]') ? 'array' : 'string',
          description: trimmed,
          required: trimmed.includes('required') || !trimmed.includes('optional')
        });
      }
    });
    
    return params;
  }

  /**
   * Migrate a single route file
   */
  private migrateFile(filePath: string): void {
    const fileName = path.basename(filePath);
    const tag = ROUTE_TAGS_MAP[fileName] || 'API';
    
    console.log(`\n📄 Processing: ${fileName} (Tag: ${tag})`);
    
    const routes = this.parseRouteFile(filePath);
    
    if (routes.length === 0) {
      console.log(`   ⚠️  No routes found with old-style comments`);
      return;
    }
    
    console.log(`   ✅ Found ${routes.length} routes to migrate`);
    
    if (!this.writeMode) {
      console.log(`   📋 Preview of first route:`);
      if (routes[0]) {
        const swagger = this.generateSwaggerAnnotation(routes[0], tag);
        console.log(`\n${swagger}\n`);
      }
      return;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Process routes in reverse order to maintain line numbers
    for (let i = routes.length - 1; i >= 0; i--) {
      const route = routes[i];
      const swagger = this.generateSwaggerAnnotation(route, tag);
      
      // Replace old comment with new swagger annotation
      let commentEnd = route.startLine;
      while (commentEnd < lines.length && !lines[commentEnd].includes('*/')) {
        commentEnd++;
      }
      
      // Replace the comment block
      lines.splice(route.startLine, commentEnd - route.startLine + 1, swagger);
    }
    
    // Write back to file
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`   ✅ Migrated ${routes.length} routes`);
  }

  /**
   * Migrate all route files
   */
  public migrate(): void {
    console.log('🚀 Starting Swagger Documentation Migration\n');
    console.log(`Mode: ${this.writeMode ? '✍️  WRITE' : '👀 DRY RUN'}\n`);
    
    if (!this.writeMode) {
      console.log('ℹ️  Running in preview mode. Use --write to apply changes.\n');
    }
    
    const routeFiles = fs.readdirSync(this.routesDir)
      .filter(file => file.endsWith('.route.ts') || file.endsWith('.routes.ts'))
      .filter(file => file !== 'index.ts')
      .map(file => path.join(this.routesDir, file));
    
    console.log(`Found ${routeFiles.length} route files\n`);
    
    routeFiles.forEach(file => this.migrateFile(file));
    
    console.log('\n' + '='.repeat(60));
    if (this.writeMode) {
      console.log('✅ Migration complete! All route files have been updated.');
      console.log('\nNext steps:');
      console.log('1. Review the changes: git diff');
      console.log('2. Restart server: npm run dev');
      console.log('3. Check Swagger UI: http://localhost:5000/api-docs');
      console.log('4. Generate Postman: npm run docs');
    } else {
      console.log('👀 Preview complete!');
      console.log('\nTo apply changes, run:');
      console.log('   npm run migrate:swagger --write');
    }
    console.log('='.repeat(60) + '\n');
  }
}

// Main execution
const routesDir = path.join(__dirname, '..', 'src', 'routes');
const writeMode = process.argv.includes('--write') || process.argv.includes('-w');

const migrator = new SwaggerMigrator(routesDir, writeMode);
migrator.migrate();
