import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { OracleService } from './oracle.service.js';
import { fetchOracleDetails } from '../../../common/ats-details.js';

export { OracleService };
export * from './oracle.constants.js';
export * from './oracle.types.js';

const service = new OracleService();

export class OracleAdapter implements AtsAdapter {
  providerName = 'Oracle';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'oracle', companyName, 'ATS'));
  }
  async fetchJobDetails(job: AtsJob, page?: any): Promise<any> {
    return fetchOracleDetails(job.applyLink, page);
  }
}
