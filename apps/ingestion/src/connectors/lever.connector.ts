import axios from 'axios';
import { logger } from '@fresherflow/logger';

export class LeverConnector {
    private readonly baseUrl = 'https://api.lever.co/v0';

    /**
     * Fetches raw JSON job postings for a company hosted on Lever
     */
    async fetchPostings(companyId: string) {
        try {
            const response = await axios.get(`${this.baseUrl}/postings/${companyId}?mode=json`);
            logger.info(`Fetched ${response.data?.length || 0} postings from Lever for ${companyId}`);
            return response.data;
        } catch (error: any) {
            logger.error(`Failed to fetch Lever postings for ${companyId}:`, error.message);
            throw error;
        }
    }

    /**
     * Note: Normalize Lever standard schema to FresherFlow schema later using Parsers
     */
}
