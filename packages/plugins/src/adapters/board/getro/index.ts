import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { GetroService } from './getro.service.js';

export { GetroService };
export * from './getro.constants.js';
export * from './getro.types.js';

const service = new GetroService();

export class GetroAdapter implements AtsAdapter {
  providerName = 'Getro';
  async fetchJobs(collectionId: string, boardName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: collectionId, searchTerm: boardName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'getro', j.companyName || boardName, 'ATS'));
  }
}
