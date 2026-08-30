import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { ConsiderService } from './consider.service.js';

export { ConsiderService };
export * from './consider.constants.js';
export * from './consider.types.js';

const service = new ConsiderService();

export class ConsiderAdapter implements AtsAdapter {
  providerName = 'Consider';
  async fetchJobs(portalUrl: string, boardName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: portalUrl, searchTerm: boardName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'consider', j.companyName || boardName, 'AGGREGATOR'));
  }
}
