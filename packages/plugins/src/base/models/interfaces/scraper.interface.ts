import { ScraperInputDto } from '../dtos/scraper-input.dto';
import { JobResponseDto } from '../dtos/job-response.dto';

/**
 * Interface that every source scraper service must implement.
 */
export interface IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}

/**
 * Injection token used to register all scraper services.
 */
export const SCRAPER_TOKEN = 'SCRAPER';
