import 'dotenv/config';
import { MetadataService } from '../infrastructure/services/metadata.service';

async function run() {
    console.log("Starting backfill script for company slugs...");
    await MetadataService.backfillCompanySlugs();
    console.log("Backfill script finished.");
    process.exit(0);
}

run().catch((err) => {
    console.error("Backfill script crashed:", err);
    process.exit(1);
});
