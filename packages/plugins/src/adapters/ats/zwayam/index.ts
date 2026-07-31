import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { ZwayamService } from './zwayam.service.js';

export { ZwayamService };
export * from './zwayam.constants.js';
export * from './zwayam.types.js';

const service = new ZwayamService();

export class ZwayamAdapter implements AtsAdapter {
  providerName = 'Zwayam';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'zwayam', companyName, 'ATS'));
  }
}
