import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { PyjamaHrService } from './pyjamahr.service.js';

export { PyjamaHrService };
export * from './pyjamahr.constants.js';
export * from './pyjamahr.types.js';

const service = new PyjamaHrService();

export class PyjamaHRAdapter implements AtsAdapter {
  providerName = 'Pyjamahr';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'pyjamahr', companyName, 'ATS'));
  }
}
