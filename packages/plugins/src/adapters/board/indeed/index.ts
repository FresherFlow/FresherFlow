import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { IndeedService } from './indeed.service.js';

export { IndeedService };
export * from './indeed.constants.js';

const service = new IndeedService();

export class IndeedAdapter implements AtsAdapter {
  providerName = 'Indeed';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'indeed', companyName, 'AGGREGATOR'));
  }
}
