import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { GreytHrService } from './greythr.service.js';

export { GreytHrService };
export * from './greythr.constants.js';
export * from './greythr.types.js';

const service = new GreytHrService();

export class GreythrAdapter implements AtsAdapter {
  providerName = 'Greythr';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'greythr', companyName, 'ATS'));
  }
}
