import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { RemoteOkService } from './remoteok.service.js';

export { RemoteOkService };
export * from './remoteok.constants.js';
export * from './remoteok.types.js';

const service = new RemoteOkService();

export class RemoteOkAdapter implements AtsAdapter {
  providerName = 'Remoteok';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'remoteok', companyName, 'AGGREGATOR'));
  }
}
