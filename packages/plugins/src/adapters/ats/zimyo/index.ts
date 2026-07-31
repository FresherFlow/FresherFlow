import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { ZimyoService } from './zimyo.service.js';

export { ZimyoService };
export * from './zimyo.constants.js';
export * from './zimyo.types.js';

const service = new ZimyoService();

export class ZimyoAdapter implements AtsAdapter {
  providerName = 'Zimyo';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'zimyo', companyName, 'ATS'));
  }
}
