import { AtsAdapter, AtsJob, toAtsJob } from '../../../base/BaseAdapter.js';
import { StripeService } from './stripe.service.js';

export { StripeService };

const service = new StripeService();

export class StripeAdapter implements AtsAdapter {
  providerName = 'Stripe';
  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'stripe', companyName, 'ATS'));
  }
}
