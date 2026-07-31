import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { AmazonService } from './amazon.service.js';

export { AmazonService };
export * from './amazon.constants.js';
export * from './amazon.types.js';

const service = new AmazonService();

export class AmazonAdapter implements AtsAdapter {
  providerName = 'Amazon';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'amazon', companyName, 'ATS'));
  }
}
