import 'dotenv/config';
import { MetadataService } from '../infrastructure/services/metadata.service';
import { logger } from '@fresherflow/logger';

async function run() {
    logger.info("Starting backfill script for company slugs...");
    await MetadataService.backfillCompanySlugs();
    logger.info("Backfill script finished.");
    process.exit(0);
}

run().catch((err) => {
    logger.error("Backfill script crashed", { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
});
