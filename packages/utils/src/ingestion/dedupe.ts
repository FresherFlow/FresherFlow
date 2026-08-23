import crypto from 'crypto';

/**
 * IngestionDedupe - Pure Domain Logic
 * Handles title normalization and hash generation for consistency across the ingestion pipeline.
 * Infrastructure operations (Redis/DB) must be performed by the application/infrastructure layer.
 */
export class IngestionDedupe {
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
            .replace(/[()[\]{}\-_]/g, ' ')
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
     * Hashes the source-specific external ID to create a unique signature.
     * Used for Greenhouse, Lever, etc.
     */
    static generateSourceHash(sourceId: string, externalId: string): string {
        const raw = `${sourceId.toLowerCase().trim()}::${externalId.toLowerCase().trim()}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
}
