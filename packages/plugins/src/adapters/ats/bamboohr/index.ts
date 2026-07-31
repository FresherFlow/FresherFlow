import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { BambooHRService } from './bamboohr.service.js';

export { BambooHRService };
export * from './bamboohr.constants.js';
export * from './bamboohr.types.js';

const service = new BambooHRService();

export class BambooHRAdapter implements AtsAdapter {
  providerName = 'Bamboohr';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'bamboohr', companyName, 'ATS'));
  }
}
