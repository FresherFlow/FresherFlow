import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { HackerNewsService } from './hackernews.service.js';

export { HackerNewsService };
export * from './hackernews.constants.js';
export * from './hackernews.types.js';

const service = new HackerNewsService();

export class HackerNewsAdapter implements AtsAdapter {
  providerName = 'Hackernews';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'hackernews', companyName, 'AGGREGATOR'));
  }
}
