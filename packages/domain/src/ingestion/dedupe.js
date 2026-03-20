"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionDedupe = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("@fresherflow/redis");
const logger_1 = require("@fresherflow/logger");
class IngestionDedupe {
    /**
     * Normalizes a job title to prevent duplicates from subtle variations.
     * e.g., "Sr. Frontend Eng" -> "senior frontend engineer"
     */
    static normalizeTitle(title) {
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
    static generateHash(company, title, location) {
        const normTitle = this.normalizeTitle(title);
        const raw = `${company.toLowerCase().trim()}|${normTitle}|${location.toLowerCase().trim()}`;
        return crypto_1.default.createHash('sha256').update(raw).digest('hex');
    }
    /**
     * Checks if this exact job signature was already ingested recently.
     * Logic moved from the ingestion service to the domain for consistency.
     */
    static async isDuplicate(company, title, location = 'remote') {
        const hash = this.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;
        try {
            if (!redis_1.redis || !redis_1.redis.get)
                return false;
            const exists = await redis_1.redis.get(key);
            if (exists)
                return true;
        }
        catch (error) {
            logger_1.logger.error(`Error checking dedupe hash for ${company} - ${title}:`, error);
        }
        return false;
    }
    /**
     * Marks this job signature as ingested.
     * Logic moved from the ingestion service to the domain for consistency.
     */
    static async markIngested(company, title, location = 'remote') {
        const hash = this.generateHash(company, title, location);
        const key = `ingestion:dedupe:${hash}`;
        try {
            if (!redis_1.redis || !redis_1.redis.set)
                return;
            await redis_1.redis.set(key, '1', 'EX', 60 * 60 * 24 * 90);
        }
        catch (error) {
            logger_1.logger.error(`Error marking dedupe hash for ${company} - ${title}:`, error);
        }
    }
    /**
     * Hashes the source-specific external ID to create a unique signature.
     * Used for Greenhouse, Lever, etc.
     */
    static generateSourceHash(sourceId, externalId) {
        const raw = `${sourceId.toLowerCase().trim()}::${externalId.toLowerCase().trim()}`;
        return crypto_1.default.createHash('sha256').update(raw).digest('hex');
    }
}
exports.IngestionDedupe = IngestionDedupe;
