import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { TurboHireService } from './turbohire.service.js';

export { TurboHireService };
export * from './turbohire.constants.js';
export * from './turbohire.types.js';

const service = new TurboHireService();

export class TurboHireAdapter implements AtsAdapter {
  providerName = 'Turbohire';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'turbohire', companyName, 'ATS'));
  }
}
