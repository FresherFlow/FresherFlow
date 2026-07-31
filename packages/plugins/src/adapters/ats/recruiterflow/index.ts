import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { RecruiterflowService } from './recruiterflow.service.js';

export { RecruiterflowService };
export * from './recruiterflow.constants.js';
export * from './recruiterflow.types.js';

const service = new RecruiterflowService();

export class RecruiterflowAdapter implements AtsAdapter {
  providerName = 'Recruiterflow';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'recruiterflow', companyName, 'ATS'));
  }
}
