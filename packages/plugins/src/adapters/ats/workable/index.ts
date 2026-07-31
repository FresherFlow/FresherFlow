import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { WorkableService } from './workable.service.js';

export { WorkableService };
export * from './workable.constants.js';
export * from './workable.types.js';

const service = new WorkableService();

export class WorkableAdapter implements AtsAdapter {
  providerName = 'Workable';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'workable', companyName, 'ATS'));
  }
}
