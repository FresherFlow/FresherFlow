import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { CeipalService } from './ceipal.service.js';

export { CeipalService };
export * from './ceipal.constants.js';
export * from './ceipal.types.js';

const service = new CeipalService();

export class CeipalAdapter implements AtsAdapter {
  providerName = 'Ceipal';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'ceipal', companyName, 'ATS'));
  }
}
