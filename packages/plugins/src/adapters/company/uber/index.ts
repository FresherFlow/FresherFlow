import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { UberService } from './uber.service.js';

export { UberService };

const service = new UberService();

export class UberAdapter implements AtsAdapter {
  providerName = 'Uber';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'uber', companyName, 'ATS'));
  }
}
