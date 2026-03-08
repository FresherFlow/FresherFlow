import crypto from 'crypto';
import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';

export class DedupeService {
    /**
     * Normalizes a job title to prevent duplicates from subtle variations.
     * e.g., "Sr. Frontend Eng" -> "senior frontend engineer"
     */
    static normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/\b(sr\.?|senior)\b/g, 'senior')
            .replace(/\b(jr\.?|junior)\b/g, 'junior')
            .replace(/\b(eng|engg|engineer)\b/g, 'engineer')
            .replace(/\b(dev|developer)\b/g, 'developer')
            .replace(/[\(\)\[\]\{\}\-\_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Hashes the core properties to create a unique signature.
     */
    static generateHash(company: string, title: string, location: string): string {
        const normTitle = this.normalizeTitle(title);
        const raw = `${company.toLowerCase().trim()}|${normTitle}|${location.toLowerCase().trim()}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    /**
     * Checks if this exact job signature was already ingested recently.
     */
    static async isDuplicate(company: string, title: string, location: string = 'remote'): Promise<boolean> {
        const hash = this.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;

        try {
            // Failsafe handling: if no redis in dev, don't break dedupe, just return false
            if (!redis || !redis.get) {
                return false;
            }
            const exists = await redis.get(key);
            if (exists) {
                return true;
            }
        } catch (error) {
            logger.error(`Error checking dedupe hash for ${company} - ${title}:`, error);
        }
        return false;
    }

    /**
     * Marks this job signature as ingested so future checks return true.
     * Retains the memory for 90 days.
     */
    static async markIngested(company: string, title: string, location: string = 'remote'): Promise<void> {
        const hash = this.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;

        try {
            if (!redis || !redis.set) return;
            // Keep dedupe state for ~90 days
            await redis.set(key, '1', 'EX', 60 * 60 * 24 * 90);
            logger.debug(`Marked ingested dedupe: ${company} - ${title}`);
        } catch (error) {
            logger.error(`Error marking dedupe hash for ${company} - ${title}:`, error);
        }
    }
}
