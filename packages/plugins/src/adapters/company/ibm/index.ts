import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { IbmService } from './ibm.service.js';

export { IbmService };
export * from './ibm.constants.js';
export * from './ibm.types.js';

const service = new IbmService();

export class IbmAdapter implements AtsAdapter {
  providerName = 'Ibm';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'ibm', companyName, 'ATS'));
  }
}
