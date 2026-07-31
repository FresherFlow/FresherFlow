import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { IcimsService } from './icims.service.js';

export { IcimsService };
export * from './icims.constants.js';
export * from './icims.types.js';

const service = new IcimsService();

export class ICimsAdapter implements AtsAdapter {
  providerName = 'Icims';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'icims', companyName, 'ATS'));
  }
}
