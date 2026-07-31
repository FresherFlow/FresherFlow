import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { RecruitCrmService } from './recruitcrm.service.js';

export { RecruitCrmService };
export * from './recruitcrm.constants.js';
export * from './recruitcrm.types.js';

const service = new RecruitCrmService();

export class RecruitCrmAdapter implements AtsAdapter {
  providerName = 'Recruitcrm';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'recruitcrm', companyName, 'ATS'));
  }
}
