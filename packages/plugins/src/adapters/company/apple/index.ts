import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { AppleService } from './apple.service.js';

export { AppleService };
export * from './apple.constants.js';
export * from './apple.types.js';

const service = new AppleService();

export class AppleAdapter implements AtsAdapter {
  providerName = 'Apple';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'apple', companyName, 'ATS'));
  }
}
