import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { InternshalaService } from './internshala.service.js';

export { InternshalaService };

const service = new InternshalaService();

export class InternshalaAdapter implements AtsAdapter {
  providerName = 'Internshala';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'internshala', companyName, 'AGGREGATOR'));
  }
}
