import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { PersonioService } from './personio.service.js';

export { PersonioService };
export * from './personio.constants.js';
export * from './personio.types.js';

const service = new PersonioService();

export class PersonioAdapter implements AtsAdapter {
  providerName = 'Personio';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'personio', companyName, 'ATS'));
  }
}
