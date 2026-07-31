import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { MetaService } from './meta.service.js';

export { MetaService };

const service = new MetaService();

export class MetaAdapter implements AtsAdapter {
  providerName = 'Meta';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'meta', companyName, 'ATS'));
  }
}
