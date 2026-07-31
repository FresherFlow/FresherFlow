import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { HrOneService } from './hrone.service.js';

export { HrOneService };
export * from './hrone.constants.js';
export * from './hrone.types.js';

const service = new HrOneService();

export class HROneAdapter implements AtsAdapter {
  providerName = 'Hrone';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'hrone', companyName, 'ATS'));
  }
}
