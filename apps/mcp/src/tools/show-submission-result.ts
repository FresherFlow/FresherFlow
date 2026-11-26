import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { JOB_CARDS_URI } from '../widget/job-cards-resource.js';
import { getMySubmission, SubmissionLookupError } from '../api/submissions.js';

const inputSchema = z.object({
  submissionId: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .describe(
      'The submission id: either the submissionId from submit_opportunity (which is the listing id) '
      + 'or an id from list_my_submissions. The server looks up the real record; status from the model is never accepted.',
    ),
});

const outputSchema = z.object({
  displayed: z.literal(true),
  view: z.literal('submission'),
  kind: z.enum(['submission-record', 'public-listing']),
});

/** Pure normalization so the truth boundary can be unit tested. */
export function normalizeSubmissionRecord(kind: 'submission-record' | 'public-listing', raw: Record<string, unknown>) {
  const text = (value: unknown) => (typeof value === 'string' ? value : '');
  const opportunity =
    raw.opportunity && typeof raw.opportunity === 'object'
      ? (raw.opportunity as Record<string, unknown>)
      : {};
  const extracted =
    raw.extractedData && typeof raw.extractedData === 'object'
      ? (raw.extractedData as Record<string, unknown>)
      : {};

  if (kind === 'public-listing') {
    // Public fields only. No submission id, no private state, no apply URL.
    const status = text(raw.status);
    const live =
      status === 'PUBLISHED'
      && raw.deletedAt == null
      && (raw.expiresAt == null || Date.parse(text(raw.expiresAt)) > Date.now());
    return {
      id: undefined as string | undefined,
      title: text(raw.title),
      company: text(raw.company),
      status,
      slug: live ? text(raw.slug) || undefined : undefined,
      published: live,
      stale: false,
      missingFields: [] as string[],
      rejectionReason: undefined as string | undefined,
      extractedData: undefined,
      applyUrl: undefined,
    };
  }

  const submissionStatus = text(raw.status);
  const opportunityStatus = text(opportunity.status);
  const targetPublished =
    opportunityStatus === 'PUBLISHED'
    && opportunity.deletedAt == null
    && (opportunity.expiresAt == null || Date.parse(text(opportunity.expiresAt)) > Date.now());
  const live =
    submissionStatus === 'PUBLISHED'
    && opportunityStatus === 'PUBLISHED'
    && opportunity.deletedAt == null
    && (opportunity.expiresAt == null || Date.parse(text(opportunity.expiresAt)) > Date.now());
  const missingFields = Array.isArray(extracted.missingFields)
    ? extracted.missingFields.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    id: text(raw.id),
    title: text(raw.title),
    company: text(raw.company),
    status: submissionStatus,
    slug: targetPublished ? text(opportunity.slug) || undefined : undefined,
    targetPublished,
    published: live,
    stale: submissionStatus === 'PUBLISHED' && !live,
    missingFields,
    rejectionReason:
      text(opportunity.deletionReason) || text(extracted.rejectionReason) || text(extracted.withdrawalReason) || undefined,
    extractedData: undefined,
    applyUrl: text(raw.applyUrl) || undefined,
  };
}

export function registerShowSubmissionResult(server: McpServer): void {
  server.registerTool(
    'show_submission_result',
    {
      title: 'Show a FresherFlow submission result',
      description:
        'Show the real status of one of your submissions. Pass ONLY the submissionId from submit_opportunity '
        + 'or list_my_submissions. The server reads the authoritative record; model-supplied status is never accepted. '
        + 'Use after submitting and whenever the user asks whether their submission is live, pending, merged or rejected.',
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: { ui: { resourceUri: JOB_CARDS_URI } },
    },
    async ({ submissionId }: z.infer<typeof inputSchema>) => {
      try {
        const { kind, data } = await getMySubmission(submissionId);
        const normalized = normalizeSubmissionRecord(kind, data);
        return {
          structuredContent: { displayed: true as const, view: 'submission' as const, kind },
          content: [{ type: 'text' as const, text: `Status: ${normalized.status}. ${normalized.published ? 'Live on FresherFlow.' : 'Not live yet.'}` }],
          _meta: { fresherflowWidget: { view: 'submission', kind, data: normalized } },
        };
      } catch (error) {
        if (error instanceof SubmissionLookupError) {
          return {
            isError: true as const,
            content: [{ type: 'text' as const, text: error.message }],
            _meta: { fresherflowWidget: { view: 'submission', kind: 'error', data: { message: error.message } } },
          };
        }
        throw error;
      }
    },
  );
}
