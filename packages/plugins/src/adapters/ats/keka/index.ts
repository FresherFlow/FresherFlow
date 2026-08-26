import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { KekaService } from './keka.service.js';
import { fetchKekaDetails } from '../../../common/ats-details.js';

export { KekaService };
export * from './keka.constants.js';
export * from './keka.types.js';

const service = new KekaService();

export class KekaAdapter implements AtsAdapter {
  providerName = 'Keka';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'keka', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, _page?: any): Promise<any> {
    return fetchKekaDetails(job.applyLink);
  }
}

