import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { LeverService } from './lever.service.js';

export { LeverService };
export * from './lever.constants.js';
export * from './lever.types.js';

const service = new LeverService();

export class LeverAdapter implements AtsAdapter {
  providerName = 'Lever';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'lever', companyName, 'ATS'));
  }
}
