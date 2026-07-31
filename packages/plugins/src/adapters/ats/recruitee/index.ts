import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { RecruiteeService } from './recruitee.service.js';

export { RecruiteeService };
export * from './recruitee.constants.js';
export * from './recruitee.types.js';

const service = new RecruiteeService();

export class RecruiteeAdapter implements AtsAdapter {
  providerName = 'Recruitee';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'recruitee', companyName, 'ATS'));
  }
}
