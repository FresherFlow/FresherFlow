import { Site } from '../enums/site.enum';
import { JobType } from '../enums/job-type.enum';
import { DescriptionFormat } from '../enums/description-format.enum';
import { Country } from '../enums/country.enum';

export class ScraperInputDto {
  siteType?: Site[];
  searchTerm?: string;
  googleSearchTerm?: string;
  location?: string;
  distance?: number;
  isRemote?: boolean;
  jobType?: JobType;
  easyApply?: boolean;
  resultsWanted?: number;
  offset?: number;
  hoursOld?: number;
  country?: Country;
  descriptionFormat?: DescriptionFormat;
  linkedinFetchDescription?: boolean;
  linkedinCompanyIds?: number[];
  requestTimeout?: number;
  proxies?: string[];
  caCert?: string;
  userAgent?: string;
  clientIp?: string;
  enforceAnnualSalary?: boolean;
  rateDelayMin?: number;
  rateDelayMax?: number;
  companySlug?: string;
  companyUrl?: string;
  maxConcurrentCompanies?: number;
  siteNumber?: string;
  descriptionDepth?: 'board' | 'detail-25' | 'detail-all';
  retries?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  retryMaxDelay?: number;
  auth?: Record<string, any>;

  constructor(partial?: Partial<ScraperInputDto>) {
    this.siteType = Object.values(Site);
    this.resultsWanted = 15;
    this.offset = 0;
    this.distance = 50;
    this.isRemote = false;
    this.country = Country.USA;
    this.descriptionFormat = DescriptionFormat.MARKDOWN;
    this.linkedinFetchDescription = false;
    this.requestTimeout = 60;
    this.maxConcurrentCompanies = 5;
    // Sensible retry/rate defaults — every scraper inherits these
    this.retries = 4;
    this.retryBackoff = 'exponential';
    this.retryMaxDelay = 30_000;
    this.rateDelayMin = 0.1;
    this.rateDelayMax = 0.3;
    Object.assign(this, partial);
  }
}
