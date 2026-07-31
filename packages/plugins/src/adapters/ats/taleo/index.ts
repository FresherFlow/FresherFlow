import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { TaleoService } from './taleo.service.js';

export { TaleoService };
export * from './taleo.constants.js';
export * from './taleo.types.js';

const service = new TaleoService();

export class TaleoAdapter implements AtsAdapter {
  providerName = 'Taleo';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'taleo', companyName, 'ATS'));
  }
}
