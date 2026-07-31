import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { NaukriService } from './naukri.service.js';

export { NaukriService };
export * from './naukri.constants.js';

const service = new NaukriService();

export class NaukriAdapter implements AtsAdapter {
  providerName = 'Naukri';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'naukri', companyName, 'AGGREGATOR'));
  }
}
