import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { AshbyService } from './ashby.service.js';
import { fetchAshbyDetails } from '../../../common/ats-details.js';

export { AshbyService };
export * from './ashby.constants.js';
export * from './ashby.types.js';

const service = new AshbyService();

export class AshbyAdapter implements AtsAdapter {
  providerName = 'Ashby';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'ashby', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchAshbyDetails(job.applyLink);
  }
}
