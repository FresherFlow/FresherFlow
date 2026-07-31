import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { OorwinService } from './oorwin.service.js';

export { OorwinService };
export * from './oorwin.constants.js';
export * from './oorwin.types.js';

const service = new OorwinService();

export class OorwinAdapter implements AtsAdapter {
  providerName = 'Oorwin';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'oorwin', companyName, 'ATS'));
  }
}
