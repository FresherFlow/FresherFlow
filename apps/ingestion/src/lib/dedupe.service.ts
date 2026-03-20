import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';
import { IngestionDedupe as DedupeLogic } from '@fresherflow/domain';

export class IngestionDedupeService {
    /**
     * Checks if this exact job signature was already ingested recently.
     */
    static async isDuplicate(company: string, title: string, location: string = 'remote'): Promise<boolean> {
        const hash = DedupeLogic.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;

        try {
            if (!redis || typeof (redis as any).get !== 'function') return false;
            const exists = await (redis as any).get(key);
            if (exists) return true;
        } catch (error) {
            logger.error(`Error checking dedupe hash for ${company} - ${title}:`, error);
        }
        return false;
    }

    /**
     * Marks this job signature as ingested.
     */
    static async markIngested(company: string, title: string, location: string = 'remote'): Promise<void> {
        const hash = DedupeLogic.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;

        try {
            if (!redis || typeof (redis as any).set !== 'function') return;
            await (redis as any).set(key, '1', 'EX', 60 * 60 * 24 * 90);
        } catch (error) {
            logger.error(`Error marking dedupe hash for ${company} - ${title}:`, error);
        }
    }
}
