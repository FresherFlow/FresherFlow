import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { ISmartRecruitService } from './ismartrecruit.service.js';

export { ISmartRecruitService };
export * from './ismartrecruit.constants.js';
export * from './ismartrecruit.types.js';

const service = new ISmartRecruitService();

export class ISmartRecruitAdapter implements AtsAdapter {
  providerName = 'Ismartrecruit';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'ismartrecruit', companyName, 'ATS'));
  }
}
