import cron from 'node-cron';
import { logger } from '@fresherflow/logger';
import { IngestionPipeline } from './pipeline/ingestion.pipeline';

/**
 * Bootstraps the scheduling for all active ingestion connectors.
 */
export function startIngestionScheduler() {
    logger.info('Starting Ingestion Scheduler...');
    const pipeline = new IngestionPipeline();

    // Example: Run every 10 minutes (* /10 * * * *)
    cron.schedule('*/10 * * * *', async () => {
        logger.info('Running scheduled ingestion polling block...');

        // 1. Known Lever Boards
        await pipeline.processLeverCompany('netflix', 'Netflix');
        // await pipeline.processLeverCompany('some-other-company', 'Company B');

        // 2. Known Greenhouse Boards
        await pipeline.processGreenhouseBoard('airbnb', 'Airbnb');
        // await pipeline.processGreenhouseBoard('stripe', 'Stripe');

    });
}
