import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { WeWorkRemotelyService } from './weworkremotely.service.js';

export { WeWorkRemotelyService };
export * from './weworkremotely.constants.js';
export * from './weworkremotely.types.js';

const service = new WeWorkRemotelyService();

export class WeWorkRemotelyAdapter implements AtsAdapter {
  providerName = 'Weworkremotely';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'weworkremotely', companyName, 'AGGREGATOR'));
  }
}
