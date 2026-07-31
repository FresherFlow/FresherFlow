import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { ZohoRecruitService } from './zohorecruit.service.js';

export { ZohoRecruitService };
export * from './zohorecruit.constants.js';
export * from './zohorecruit.types.js';

const service = new ZohoRecruitService();

export class ZohoRecruitAdapter implements AtsAdapter {
  providerName = 'Zohorecruit';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'zohorecruit', companyName, 'ATS'));
  }
}
