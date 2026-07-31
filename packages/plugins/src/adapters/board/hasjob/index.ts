import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { HasJobService } from './hasjob.service.js';

export { HasJobService };
export * from './hasjob.constants.js';
export * from './hasjob.types.js';

const service = new HasJobService();

export class HasjobAdapter implements AtsAdapter {
  providerName = 'Hasjob';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'hasjob', companyName, 'AGGREGATOR'));
  }
}
