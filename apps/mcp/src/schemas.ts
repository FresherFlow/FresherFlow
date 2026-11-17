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
        .describe('Job or internship title from the posting, 1-200 chars. Do not use test names such as "TestCo" or "DELETE ME" — the API rejects them.'),
    companyName: z.string().trim().min(1, 'companyName is required').max(200)
        .describe('Company or organization name from the posting, 1-200 chars.'),
    jobUrl: z.string().trim().url('jobUrl must be a valid URL').max(2000)
        .describe('Official job posting URL, HTTPS only, max 2000 chars. Stored as data only — FresherFlow never fetches it, so read the posting yourself.'),
    location: z.string().trim().max(120).optional()
        .describe('City or location from the posting, max 120 chars, e.g. "Hyderabad".'),
    employmentType: z.string().trim().max(80).optional()
        .describe('Employment type, max 80 chars, e.g. "Full-time", "Internship". Only recognised values are kept; an unknown value is dropped silently, so copy the posting\'s wording.'),
    /** Alias so an agent that guesses the plural name is not silently stripped. */
    employmentTypes: z.string().trim().max(80).optional()
        .describe('Alias of employmentType. Send only one of the two. Same rules: max 80 chars, recognised values only.'),
    category: z.enum(['job', 'internship', 'walkin', 'government']).optional()
        .describe('Posting kind. Use "walkin" for dated drives (add dates/venueAddress), "government" for public-sector jobs. Defaults to "job".'),
    dates: z.array(z.string().trim().max(40)).max(10).optional()
        .describe('Walk-in dates, max 10 entries of 40 chars, e.g. ["2026-10-04"]. Invalid dates are dropped; if none remain, today is stored — so send real dates.'),
    dateRange: z.string().trim().max(120).optional()
        .describe('Walk-in date range text, e.g. "4th - 5th Oct". Only used with category "walkin".'),
    timeRange: z.string().trim().max(120).optional()
        .describe('Walk-in reporting time, e.g. "10am - 2pm". Only used with category "walkin".'),
    venueAddress: z.string().trim().max(500).optional()
        .describe('Walk-in venue, max 500 chars. Always provide the real venue: if omitted, the location or the literal "Venue shared after apply" is stored.'),
    salary: z.string().trim().max(60).optional()
        .describe('Salary as stated in the posting, max 60 chars, e.g. "₹5–7 LPA". Do not guess or invent a figure.'),
    description: z.string().trim().max(5000).optional()
        .describe('Description from the posting, max 5000 chars. Put the role overview, responsibilities, requirements and eligibility here — most of the useful job information belongs in this field. Copy from the posting; never invent facts.'),
    eligibility: z.string().trim().max(2000).optional()
        .describe('Eligibility: degrees, courses, pass-out years. Send it in the source posting\'s own words — it is parsed into structured eligibility, so the listing is still filterable by degree and batch.'),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).optional()
        .describe('Required skills, one entry each, e.g. ["React", "TypeScript"]. Read them off the posting; do not invent any.'),
    passoutYears: z.array(z.number().int().min(1990).max(2100)).max(15).optional()
        .describe('Eligible graduation years as numbers, e.g. [2025, 2026]. Use only when the posting states them, and spell out a range rather than sending it as text.'),
    sourceUrl: z.string().trim().url('sourceUrl must be a valid URL').max(2000).optional()
        .describe('Only when the posting was found at a different URL than the apply link. Normally omit: jobUrl is used for both.'),
    contactEmail: z.string().trim().email('contactEmail must be valid').max(200).optional()
        .describe('Optional contact email for follow-up'),
    companyWebsite: z.string().trim().url('companyWebsite must be a valid URL').max(2000).optional()
        .describe('Company website from the posting, HTTPS URL. Leave out when the posting does not state one.'),
    workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional()
        .describe('Work mode when stated: ONSITE, HYBRID or REMOTE. Omit when the posting does not say.'),
    salaryPeriod: z.enum(['MONTHLY', 'YEARLY']).optional()
        .describe('Salary period: MONTHLY or YEARLY. Only when a salary figure is given.'),
    experienceMin: z.number().int().min(0).max(50).optional()
        .describe('Minimum years of experience, only when the posting states it. Never infer.'),
    experienceMax: z.number().int().min(0).max(50).optional()
        .describe('Maximum years of experience, only when the posting states it. Never infer.'),
    jobFunction: z.string().trim().max(120).optional()
        .describe('Job function or domain from the posting, e.g. "Software Engineering".'),
    allowedCourses: z.array(z.string().trim().min(1).max(80)).max(20).optional()
        .describe('Degree names from the posting, e.g. ["B.Tech", "B.Sc"].'),
    allowedSpecializations: z.array(z.string().trim().min(1).max(80)).max(20).optional()
        .describe('Branch or specialization names, e.g. ["Computer Science"].'),
    expiresAt: z.string().trim().max(40).optional()
        .describe('Application deadline as ISO datetime (YYYY-MM-DDTHH:mm) or timestamp, only when stated.'),
}).superRefine((data, ctx) => {
    if (!/^https:\/\//i.test(data.jobUrl)) {
        ctx.addIssue({ code: 'custom', path: ['jobUrl'], message: 'jobUrl must use https' });
    }
    if (data.sourceUrl && !/^https:\/\//i.test(data.sourceUrl)) {
        ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl must use https' });
    }
});

export type SubmitOpportunityInput = z.infer<typeof SubmitOpportunityInput>;

// ─── submit_opportunity output ───────────────────────────────────────────────

export const SubmitOpportunityOutput = z.object({
    submissionId: z.string().describe('Internal submission id'),
    slug: z.string().nullable().describe('Generated slug, null if the opportunity already existed'),
    status: z.enum(['DRAFT', 'PUBLISHED']).describe(
        'DRAFT: saved and waiting for a moderator to publish it. PUBLISHED: live on FresherFlow.',
    ),
    published: z.boolean().describe('true only when the opportunity is live on FresherFlow'),
    /** Present when the job URL already existed on FresherFlow. */
    duplicate: z.boolean().optional().describe('true when this URL already existed on FresherFlow'),
    message: z.string().describe('Human-readable status message'),
});

export type SubmitOpportunityOutput = z.infer<typeof SubmitOpportunityOutput>;
