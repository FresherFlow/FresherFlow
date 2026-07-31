import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { GlassdoorService } from './glassdoor.service.js';

export { GlassdoorService };
export * from './glassdoor.constants.js';

const service = new GlassdoorService();

export class GlassdoorAdapter implements AtsAdapter {
  providerName = 'Glassdoor';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'glassdoor', companyName, 'AGGREGATOR'));
  }
}
