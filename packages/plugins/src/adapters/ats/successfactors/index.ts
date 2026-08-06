import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { SuccessFactorsService } from './successfactors.service.js';
import { fetchSuccessFactorsDetails } from '../../../common/ats-details.js';

export { SuccessFactorsService };
export * from './successfactors.constants.js';
export * from './successfactors.types.js';

const service = new SuccessFactorsService();

export class SuccessFactorsAdapter implements AtsAdapter {
  providerName = 'Successfactors';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'successfactors', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchSuccessFactorsDetails(job.applyLink, page);
  }
}
