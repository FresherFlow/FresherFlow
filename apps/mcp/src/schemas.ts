import { z } from 'zod';

/**
 * Input and output for the single tool this server exposes: submit_opportunity.
 *
 * ChatGPT never reaches the database or the API directly — every call is
 * funnelled through these schemas only. Field limits mirror the API's
 * `mcpSubmitOpportunitySchema` (apps/api/src/utils/validation.ts) so nothing the
 * tool accepts is silently stripped before the handler runs.
 */

// ─── submit_opportunity input ────────────────────────────────────────────────

export const SubmitOpportunityInput = z.object({
    title: z.string().trim().min(1, 'title is required').max(200)
        .describe('Job or internship title, e.g. "Software Engineer"'),
    companyName: z.string().trim().min(1, 'companyName is required').max(200)
        .describe('Company or organization name'),
    jobUrl: z.string().trim().url('jobUrl must be a valid URL').max(2000)
        .describe('Official job posting URL (https). Stored only — never fetched by the server.'),
    location: z.string().trim().max(120).optional()
        .describe('City or location, e.g. "Hyderabad"'),
    employmentType: z.string().trim().max(80).optional()
        .describe('e.g. "Full-time", "Internship"'),
    category: z.enum(['job', 'internship', 'walkin', 'government']).optional()
        .describe('Posting kind. Use "walkin" for dated drives (add dates/venueAddress), "government" for public-sector jobs. Defaults to "job".'),
    dates: z.array(z.string().trim().max(40)).max(10).optional()
        .describe('Walk-in drive dates, e.g. ["2026-10-04"]. Only used with category "walkin".'),
    dateRange: z.string().trim().max(120).optional()
        .describe('Walk-in date range text, e.g. "4th - 5th Oct". Only used with category "walkin".'),
    timeRange: z.string().trim().max(120).optional()
        .describe('Walk-in reporting time, e.g. "10am - 2pm". Only used with category "walkin".'),
    venueAddress: z.string().trim().max(500).optional()
        .describe('Walk-in venue address. Only used with category "walkin".'),
    salary: z.string().trim().max(60).optional()
        .describe('Salary display, e.g. "₹5–7 LPA"'),
    description: z.string().trim().max(5000).optional()
        .describe('Short description of the opening'),
    eligibility: z.string().trim().max(2000).optional()
        .describe('Eligibility: degrees, courses, pass-out years'),
    sourceUrl: z.string().trim().url('sourceUrl must be a valid URL').max(2000).optional()
        .describe('Original source URL if different from jobUrl'),
    contactEmail: z.string().trim().email('contactEmail must be valid').max(200).optional()
        .describe('Optional contact email for follow-up'),
    submitKey: z.string().trim().min(1).max(200).optional()
        .describe('Optional operator bulk key. Without it (or the server key) this submission counts against the 10/hour anonymous tier. Never ask the user for this; only use it if they paste it themselves.'),
}).superRefine((data, ctx) => {
    if (!data.jobUrl.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['jobUrl'], message: 'jobUrl must use https' });
    }
    if (data.sourceUrl && !data.sourceUrl.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl must use https' });
    }
});

export type SubmitOpportunityInput = z.infer<typeof SubmitOpportunityInput>;

// ─── submit_opportunity output ───────────────────────────────────────────────

export const SubmitOpportunityOutput = z.object({
    submissionId: z.string().describe('Internal submission id'),
    slug: z.string().nullable().describe('Generated slug, null if the opportunity already existed'),
    status: z.enum(['PENDING_REVIEW', 'PUBLISHED']).describe('Current moderation state'),
    published: z.boolean().describe('true only when the opportunity is live on FresherFlow'),
    message: z.string().describe('Human-readable status message'),
});

export type SubmitOpportunityOutput = z.infer<typeof SubmitOpportunityOutput>;
