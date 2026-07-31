import * as cheerio from 'cheerio';
import { JobType, getJobTypeFromString } from '../../../base/models/index.js';
import { JOB_TYPE_CODES } from './linkedin.constants';

/**
 * Get LinkedIn job type filter code from a JobType enum.
 */
export function jobTypeCode(jobType: JobType): string | null {
  return JOB_TYPE_CODES[jobType] ?? null;
}

/**
 * Parse the job type from an HTML element.
 */
export function parseJobType($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): JobType[] | null {
  const criteriaItems = el.find('.description__job-criteria-text');
  const result: JobType[] = [];
  criteriaItems.each((_, item) => {
    const text = $(item).text().trim().toLowerCase().replace(/[-\s]/g, '');
    const jt = getJobTypeFromString(text);
    if (jt) result.push(jt);
  });
  return result.length > 0 ? result : null;
}

/**
 * Parse the job level (seniority) from an HTML element.
 */
export function parseJobLevel($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string | null {
  const header = el.find('.description__job-criteria-subheader');
  let result: string | null = null;
  header.each((_, item) => {
    const label = $(item).text().trim().toLowerCase();
    if (label === 'seniority level') {
      const value = $(item).next('.description__job-criteria-text').text().trim();
      if (value) result = value;
    }
  });
  return result;
}

/**
 * Parse the company industry from an HTML element.
 */
export function parseCompanyIndustry($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string | null {
  const header = el.find('.description__job-criteria-subheader');
  let result: string | null = null;
  header.each((_, item) => {
    const label = $(item).text().trim().toLowerCase();
    if (label === 'industries') {
      const value = $(item).next('.description__job-criteria-text').text().trim();
      if (value) result = value;
    }
  });
  return result;
}

/**
 * Determine if a job is remote based on title, description, and location strings.
 */
export function isJobRemote(title: string, description: string, locationStr: string): boolean {
  const remoteKeywords = ['remote', 'work from home', 'wfh', 'telecommute'];
  const fullString = `${title} ${description} ${locationStr}`.toLowerCase();
  return remoteKeywords.some((kw) => fullString.includes(kw));
}
