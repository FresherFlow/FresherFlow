import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { LinkedInService } from './linkedin.service.js';

export { LinkedInService };
export * from './linkedin.constants.js';

const service = new LinkedInService();

export class LinkedinAdapter implements AtsAdapter {
  providerName = 'Linkedin';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'linkedin', companyName, 'AGGREGATOR'));
  }
}
