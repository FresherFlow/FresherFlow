import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { SnaphuntService } from './snaphunt.service.js';

export { SnaphuntService };
export * from './snaphunt.constants.js';
export * from './snaphunt.types.js';

const service = new SnaphuntService();

export class SnaphuntAdapter implements AtsAdapter {
  providerName = 'Snaphunt';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'snaphunt', companyName, 'ATS'));
  }
}
