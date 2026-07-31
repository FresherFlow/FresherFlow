import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { DarwinboxService } from './darwinbox.service.js';

export { DarwinboxService };
export * from './darwinbox.constants.js';
export * from './darwinbox.types.js';

const service = new DarwinboxService();

export class DarwinboxAdapter implements AtsAdapter {
  providerName = 'Darwinbox';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'darwinbox', companyName, 'ATS'));
  }
}
