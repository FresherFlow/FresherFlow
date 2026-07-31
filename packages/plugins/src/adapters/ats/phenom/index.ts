import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { PhenomService } from './phenom.service.js';

export { PhenomService };
export * from './phenom.constants.js';
export * from './phenom.types.js';

const service = new PhenomService();

export class PhenomAdapter implements AtsAdapter {
  providerName = 'Phenom';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'phenom', companyName, 'ATS'));
  }
}
