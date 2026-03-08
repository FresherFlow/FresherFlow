import axios from 'axios';
import { logger } from '@fresherflow/logger';

export class GreenhouseConnector {
    private readonly baseUrl = 'https://boards-api.greenhouse.io/v1';

    /**
     * Fetches raw JSON jobs for a company hosted on Greenhouse
     */
    async fetchJobs(boardToken: string) {
        try {
            const response = await axios.get(`${this.baseUrl}/boards/${boardToken}/jobs?content=true`);
            const jobs = response.data?.jobs || [];
            logger.info(`Fetched ${jobs.length} jobs from Greenhouse for ${boardToken}`);
            return jobs;
        } catch (error: any) {
            logger.error(`Failed to fetch Greenhouse jobs for ${boardToken}:`, error.message);
            throw error;
        }
    }

    /**
     * Note: Normalize Greenhouse standard schema to FresherFlow schema later using Parsers
     */
}
