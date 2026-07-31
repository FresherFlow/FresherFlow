import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { EightfoldService } from './eightfold.service.js';

export { EightfoldService };
export * from './eightfold.constants.js';
export * from './eightfold.types.js';

const service = new EightfoldService();

export class EightfoldAdapter implements AtsAdapter {
  providerName = 'Eightfold';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'eightfold', companyName, 'ATS'));
  }
}
