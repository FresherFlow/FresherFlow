import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { MicrosoftService } from './microsoft.service.js';

export { MicrosoftService };
export * from './microsoft.constants.js';
export * from './microsoft.types.js';

const service = new MicrosoftService();

export class MicrosoftAdapter implements AtsAdapter {
  providerName = 'Microsoft';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'microsoft', companyName, 'ATS'));
  }
}
