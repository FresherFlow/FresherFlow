import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { GoogleCareersService } from './google.service.js';

export { GoogleCareersService };

const service = new GoogleCareersService();

export class GoogleAdapter implements AtsAdapter {
  providerName = 'Google';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'google', companyName, 'ATS'));
  }
}
