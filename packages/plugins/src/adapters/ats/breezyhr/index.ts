import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { BreezyHRService } from './breezyhr.service.js';

export { BreezyHRService };
export * from './breezyhr.constants.js';
export * from './breezyhr.types.js';

const service = new BreezyHRService();

export class BreezyHRAdapter implements AtsAdapter {
  providerName = 'Breezyhr';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'breezyhr', companyName, 'ATS'));
  }
}
