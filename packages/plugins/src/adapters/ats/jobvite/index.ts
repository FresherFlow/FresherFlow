import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { JobviteService } from './jobvite.service.js';

export { JobviteService };
export * from './jobvite.constants.js';
export * from './jobvite.types.js';

const service = new JobviteService();

export class JobviteAdapter implements AtsAdapter {
  providerName = 'Jobvite';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'jobvite', companyName, 'ATS'));
  }
}
