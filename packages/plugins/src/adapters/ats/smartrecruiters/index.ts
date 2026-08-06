import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { SmartRecruitersService } from './smartrecruiters.service.js';
import { fetchSmartRecruitersDetails } from '../../../common/ats-details.js';

export { SmartRecruitersService };
export * from './smartrecruiters.constants.js';
export * from './smartrecruiters.types.js';

const service = new SmartRecruitersService();

export class SmartRecruitersAdapter implements AtsAdapter {
  providerName = 'Smartrecruiters';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'smartrecruiters', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchSmartRecruitersDetails(job.applyLink);
  }
}
