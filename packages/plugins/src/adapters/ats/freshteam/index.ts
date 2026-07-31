import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { FreshteamService } from './freshteam.service.js';

export { FreshteamService };
export * from './freshteam.constants.js';
export * from './freshteam.types.js';

const service = new FreshteamService();

export class FreshteamAdapter implements AtsAdapter {
  providerName = 'Freshteam';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'freshteam', companyName, 'ATS'));
  }
}
