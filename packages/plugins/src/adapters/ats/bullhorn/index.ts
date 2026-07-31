import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { BullhornService } from './bullhorn.service.js';

export { BullhornService };
export * from './bullhorn.constants.js';
export * from './bullhorn.types.js';

const service = new BullhornService();

export class BullhornAdapter implements AtsAdapter {
  providerName = 'Bullhorn';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'bullhorn', companyName, 'ATS'));
  }
}
