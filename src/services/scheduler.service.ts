/**
 * Scheduler service
 * Handles scheduling of recurring tasks like batch invoice generation
 */

import cron, { ScheduledTask } from 'node-cron';
import moment from 'moment-timezone';
import { batchInvoiceService } from './batchInvoice.service';
import logger from '../utils/logger';

/**
 * Scheduler service implementation
 */
export class SchedulerService {
  private static instance: SchedulerService;
  private activeCronJobs: Map<string, ScheduledTask> = new Map();
  
  /**
   * Get scheduler service singleton instance
   */
  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }
  
  /**
   * Initialize scheduler service
   * This should be called when the application starts
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing scheduler service');
      
      // Set up batch invoice generation schedule
      await this.setupBatchInvoiceSchedule();
      
      logger.info('Scheduler service initialized successfully');
    } catch (error) {
      logger.error('Error initializing scheduler service:', error);
    }
  }
  
  /**
   * Set up batch invoice generation schedule
   * This reads the configuration from the database and sets up the cron job
   */
  public async setupBatchInvoiceSchedule(): Promise<void> {
    try {
      // Stop existing batch invoice cron job if running
      this.stopCronJob('batch-invoice-generation');
      
      // Get batch invoice configuration
      const config = await batchInvoiceService.getOrCreateBatchConfig();
      
      // If batch processing is disabled, don't set up a cron job
      if (!config.isEnabled) {
        logger.info('Batch invoice generation is disabled');
        return;
      }
      
      // Parse time of day
      const [hour, minute] = config.timeOfDay.split(':').map(Number);
      
      // Create cron expression based on configuration
      let cronExpression: string;
      
      if (config.frequency === 'weekly') {
        // Weekly: Run on specified day of week
        cronExpression = `${minute} ${hour} * * ${config.dayOfWeek}`;
      } else if (config.frequency === 'biweekly') {
        // Biweekly: We'll need a more complex approach
        // For now, we'll use a weekly job and handle biweekly logic in the job itself
        cronExpression = `${minute} ${hour} * * ${config.dayOfWeek}`;
      } else if (config.frequency === 'monthly') {
        // Monthly: Run on a specific day of the month
        const monthlyDay = config.monthlyStartDate || 1;
        cronExpression = `${minute} ${hour} ${monthlyDay} * *`;
      } else {
        // Default to weekly on Tuesday
        cronExpression = `${minute} ${hour} * * 2`;
      }
      
      // Set up cron job
      const timezone = config.timezone || 'UTC';
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Running scheduled batch invoice generation');
          await batchInvoiceService.runScheduledBatchGeneration();
        } catch (error) {
          logger.error('Error in scheduled batch invoice generation:', error);
        }
      }, {
        timezone
      });
      
      // Store job reference
      this.activeCronJobs.set('batch-invoice-generation', job);
      
      // Calculate next run time for logging
      const nextRun = batchInvoiceService.calculateNextRunDate(config);
      logger.info(`Batch invoice generation scheduled for 
        ${moment(nextRun).format('YYYY-MM-DD HH:mm:ss')} ${timezone}`);
      
    } catch (error) {
      logger.error('Error setting up batch invoice schedule:', error);
    }
  }
  
  /**
   * Stop a running cron job
   */
  private stopCronJob(jobName: string): void {
    const job = this.activeCronJobs.get(jobName);
    if (job) {
      job.stop();
      this.activeCronJobs.delete(jobName);
      logger.info(`Stopped cron job: ${jobName}`);
    }
  }
  
  /**
   * Stop all running cron jobs
   * This should be called when the application shuts down
   */
  public stopAllJobs(): void {
    for (const [jobName, job] of this.activeCronJobs.entries()) {
      job.stop();
      logger.info(`Stopped cron job: ${jobName}`);
    }
    this.activeCronJobs.clear();
  }
}

export default SchedulerService.getInstance();