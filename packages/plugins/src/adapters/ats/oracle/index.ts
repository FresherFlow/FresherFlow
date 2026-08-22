import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { OracleService } from './oracle.service.js';
import { fetchOracleDetails } from '../../../common/ats-details.js';

export { OracleService };
export * from './oracle.constants.js';
export * from './oracle.types.js';

const service = new OracleService();

export class OracleAdapter implements AtsAdapter {
  providerName = 'Oracle';
  async fetchJobs(companyId: string, companyName: string, options?: { companyUrl?: string }): Promise<AtsJob[]> {
    // Support embedded URL format: "Company Name|||https://...oraclecloud.com/..."
    let displayName = companyName;
    let companyUrl = options?.companyUrl;
    const urlSep = companyName.indexOf('|||');
    if (urlSep !== -1) {
      displayName = companyName.slice(0, urlSep);
      companyUrl = companyName.slice(urlSep + 3);
    }

    // Support compound format: "tenant-region:SITE_NUMBER" e.g. "jpmc:CX_1001"
    // If no colon, treat whole thing as the slug with default siteNumber
    let slug = companyId;
    let siteNumber: string | undefined;
    const colonIdx = companyId.indexOf(':');
    if (colonIdx !== -1) {
      slug = companyId.slice(0, colonIdx);
      siteNumber = companyId.slice(colonIdx + 1);
    }
    const res = await service.scrape({ companyUrl, companySlug: slug, searchTerm: displayName, siteNumber });
    return (res?.jobs || []).map(j => toAtsJob(j, 'oracle', displayName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchOracleDetails(job.applyLink, page);
  }
}

