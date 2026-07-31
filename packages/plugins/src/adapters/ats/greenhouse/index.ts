import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { GreenhouseService } from './greenhouse.service.js';

export { GreenhouseService };
export * from './greenhouse.constants.js';
export * from './greenhouse.types.js';

const service = new GreenhouseService();

export class GreenhouseAdapter implements AtsAdapter {
  providerName = 'Greenhouse';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'greenhouse', companyName, 'ATS'));
  }
}
