import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { WorkdayService } from './workday.service.js';
import { fetchWorkdayDetails } from '../../../common/ats-details.js';

export { WorkdayService };
export * from './workday.constants.js';
export * from './workday.types.js';

const service = new WorkdayService();

export class WorkdayAdapter implements AtsAdapter {
  providerName = 'Workday';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'workday', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchWorkdayDetails(job.applyLink, page);
  }
}
