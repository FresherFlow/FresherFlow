import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { WellfoundService } from './wellfound.service.js';

export { WellfoundService };
export * from './wellfound.constants.js';
export * from './wellfound.types.js';

const service = new WellfoundService();

export class WellfoundAdapter implements AtsAdapter {
  providerName = 'Wellfound';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'wellfound', companyName, 'AGGREGATOR'));
  }
}
