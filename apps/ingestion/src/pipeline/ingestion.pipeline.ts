import { LeverConnector } from '../connectors/lever.connector';
import { GreenhouseConnector } from '../connectors/greenhouse.connector';
import { DedupeService } from '../services/dedupe.service';
import { ParserService } from '../services/parser.service';
import { enqueueIngestionPayload } from '@fresherflow/queue';
import { logger } from '@fresherflow/logger';

export class IngestionPipeline {
    private leverConnector = new LeverConnector();
    private greenhouseConnector = new GreenhouseConnector();

    /**
     * Orchestrates fetching from Lever, parsing, deduping, and enqueuing for DB creation.
     */
    async processLeverCompany(companyId: string, companyName: string) {
        logger.info(`Starting ingestion pipeline for Lever: ${companyName}`);
        try {
            const jobs = await this.leverConnector.fetchPostings(companyId);

            for (const job of jobs) {
                const title = job.text;
                const location = job.categories?.location || 'remote';

                // 1. Dedupe check
                const isDup = await DedupeService.isDuplicate(companyName, title, location);
                if (isDup) {
                    logger.debug(`Skipping duplicate from Lever: ${companyName} - ${title}`);
                    continue;
                }

                // 2. Parse payload using the NLP service
                // (Note: For Lever we might just extract the description, but we will pass basic fields for now)
                const description = job.descriptionPlain || job.description || '';
                const parsed = ParserService.parse(`${title}\n${description}`);

                // 3. Enqueue Job for Worker processing
                await enqueueIngestionPayload({
                    sourceId: `lever_${companyId}`,
                    rawPayload: job,
                    title,
                    company: companyName,
                    sourceLink: job.applyUrl || job.hostedUrl,
                    type: parsed.type,
                });

                // 4. Mark as ingested so we don't enqueue it again next run
                await DedupeService.markIngested(companyName, title, location);
            }
        } catch (error) {
            logger.error(`Pipeline failed for Lever company ${companyName}:`, error);
        }
    }

    /**
     * Orchestrates fetching from Greenhouse, parsing, deduping, and enqueuing for DB creation.
     */
    async processGreenhouseBoard(boardToken: string, companyName: string) {
        logger.info(`Starting ingestion pipeline for Greenhouse: ${companyName}`);
        try {
            const jobs = await this.greenhouseConnector.fetchJobs(boardToken);

            for (const job of jobs) {
                const title = job.title;
                const location = job.location?.name || 'remote';

                // 1. Dedupe check
                const isDup = await DedupeService.isDuplicate(companyName, title, location);
                if (isDup) {
                    logger.debug(`Skipping duplicate from Greenhouse: ${companyName} - ${title}`);
                    continue;
                }

                // 2. Parse using AI NLP
                const description = job.content || '';
                const parsed = ParserService.parse(`${title}\n${description}`);

                // 3. Enqueue to Worker
                await enqueueIngestionPayload({
                    sourceId: `greenhouse_${boardToken}`,
                    rawPayload: job,
                    title,
                    company: companyName,
                    sourceLink: job.absolute_url,
                    type: parsed.type,
                });

                // 4. Mark ingested internally
                await DedupeService.markIngested(companyName, title, location);
            }
        } catch (error) {
            logger.error(`Pipeline failed for Greenhouse board ${companyName}:`, error);
        }
    }
}
