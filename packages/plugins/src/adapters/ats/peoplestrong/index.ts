import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { PeopleStrongService } from './peoplestrong.service.js';

export { PeopleStrongService };
export * from './peoplestrong.constants.js';
export * from './peoplestrong.types.js';

const service = new PeopleStrongService();

export class PeoplestrongAdapter implements AtsAdapter {
  providerName = 'Peoplestrong';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'peoplestrong', companyName, 'ATS'));
  }
}
