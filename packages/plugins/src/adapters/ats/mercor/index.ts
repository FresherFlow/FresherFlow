import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { MercorService } from './mercor.service.js';

export { MercorService };
export * from './mercor.constants.js';
export * from './mercor.types.js';

const service = new MercorService();

export class MercorAdapter implements AtsAdapter {
  providerName = 'Mercor';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'mercor', companyName, 'ATS'));
  }
}
