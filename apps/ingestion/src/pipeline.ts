import { normalizeOpportunity } from '@fresherflow/domain';

/**
 * Single Entry Pipeline to process raw parsed datasets framing layouts
 * strictly through Domain Normalization constraints.
 */
export function processRawIngestion(parsedJob: any) {
    if (!parsedJob) throw new Error('No parsed dataset provided');
    return normalizeOpportunity(parsedJob);
}
