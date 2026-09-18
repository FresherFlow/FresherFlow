import { z } from 'zod';

/**
 * Whitelisted inputs and outputs for the FresherFlow MCP server.
 * ChatGPT never reaches the database or the API directly — every tool
 * call is funneled through these schemas only.
 */

// ─── search_jobs input ───────────────────────────────────────────────────────

export const SearchJobsInput = z.object({
    query: z.string().trim().min(1).max(120)
        .describe('Free-text search, e.g. "React developer" or "Java"'),
    location: z.string().trim().min(1).max(80).optional()
        .describe('City filter, e.g. "Hyderabad"'),
    jobType: z.enum(['JOB', 'INTERNSHIP', 'WALKIN']).optional()
        .describe('Restrict to full-time jobs, internships, or walk-in drives'),
    minSalary: z.number().int().min(0).max(50_000_000).optional()
        .describe('Minimum annual CTC in INR, e.g. 500000 for ₹5 LPA'),
    maxSalary: z.number().int().min(0).max(50_000_000).optional()
        .describe('Maximum annual CTC in INR'),
    limit: z.number().int().min(1).max(20).default(10)
        .describe('Max results to return (1–20)'),
})
    // minSalary must not exceed maxSalary
    .refine((v) => v.minSalary === undefined || v.maxSalary === undefined || v.minSalary <= v.maxSalary, {
        message: 'minSalary must be ≤ maxSalary',
    });

export type SearchJobsInput = z.infer<typeof SearchJobsInput>;

// ─── search_jobs output ──────────────────────────────────────────────────────

export const JobSummary = z.object({
    id: z.string().describe('Stable job id — pass to get_job for full details'),
    title: z.string(),
    company: z.string(),
    location: z.string().describe('Human-readable locations, or "Remote"'),
    salary: z.string().describe('Display salary range, e.g. "₹5–7 LPA"'),
    employmentType: z.string(),
    experience: z.string().describe('Required experience, e.g. "Fresher (0-1 yrs)"'),
    postedAt: z.string().describe('ISO 8601 posting date'),
    jobUrl: z.string().describe('Canonical FresherFlow page the user can open'),
    applyUrl: z.string().describe('Direct application link'),
});

export type JobSummary = z.infer<typeof JobSummary>;

export const SearchJobsOutput = z.object({
    totalHits: z.number(),
    hasMore: z.boolean(),
    jobs: z.array(JobSummary),
});

export type SearchJobsOutput = z.infer<typeof SearchJobsOutput>;

// ─── get_job input ───────────────────────────────────────────────────────────

export const GetJobInput = z.object({
    jobId: z.string().trim().min(1).max(120)
        .describe('Job id or slug returned by search_jobs'),
});

export type GetJobInput = z.infer<typeof GetJobInput>;

// ─── get_job output ──────────────────────────────────────────────────────────

export const JobDetail = z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    description: z.string(),
    requirements: z.array(z.string()).describe('Required skills'),
    eligibility: z.string().describe('Degrees, courses and pass-out years accepted'),
    salary: z.string(),
    location: z.string(),
    employmentType: z.string(),
    experience: z.string(),
    source: z.string().describe('Where this listing was sourced from'),
    postedAt: z.string(),
    applyUrl: z.string(),
    jobUrl: z.string(),
    verification: z.string().describe('Link health / verification status from FresherFlow checks'),
});

export const GetJobOutput = z.object({
    job: JobDetail,
});

export type GetJobOutput = z.infer<typeof GetJobOutput>;

// ─── get_job_signals input ───────────────────────────────────────────────────

export const GetJobSignalsInput = z.object({
    jobId: z.string().trim().min(1).max(120)
        .describe('Job id or slug returned by search_jobs'),
});

export type GetJobSignalsInput = z.infer<typeof GetJobSignalsInput>;

// ─── get_job_signals output ──────────────────────────────────────────────────

export const JobSignalsOutput = z.object({
    summary: z.object({
        applied: z.number().describe('Number of users who applied'),
        interviewed: z.number().describe('Number of users who interviewed'),
        offered: z.number().describe('Number of users who received offers'),
        helpful: z.number().describe('Number of users who found this helpful'),
        incorrect: z.number().describe('Number of users who flagged this as incorrect'),
    }),
    totalEngagement: z.number().describe('Total community signals on this listing'),
});

export type JobSignalsOutput = z.infer<typeof JobSignalsOutput>;

// ─── get_job_comments input ──────────────────────────────────────────────────

export const GetJobCommentsInput = z.object({
    jobId: z.string().trim().min(1).max(120)
        .describe('Job id or slug returned by search_jobs'),
    limit: z.number().int().min(1).max(20).default(10)
        .describe('Max comments to return (1–20)'),
});

export type GetJobCommentsInput = z.infer<typeof GetJobCommentsInput>;

// ─── get_job_comments output ─────────────────────────────────────────────────

export const JobComment = z.object({
    id: z.string(),
    text: z.string(),
    type: z.string().describe('Comment type: GENERAL, QUESTION, EXPERIENCE, UPDATE, CORRECTION, WARNING, REFERRAL'),
    upvotes: z.number(),
    downvotes: z.number(),
    author: z.string().describe('Username or display name'),
    postedAt: z.string().describe('ISO 8601 date'),
    replies: z.number().describe('Number of replies to this comment'),
});

export const JobCommentsOutput = z.object({
    jobId: z.string(),
    totalComments: z.number(),
    comments: z.array(JobComment),
});

export type JobCommentsOutput = z.infer<typeof JobCommentsOutput>;

// ─── submit_opportunity input ─────────────────────────────────────────────────

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
}).superRefine((data, ctx) => {
    if (!data.jobUrl.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['jobUrl'], message: 'jobUrl must use https' });
    }
    if (data.sourceUrl && !data.sourceUrl.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl must use https' });
    }
});

export type SubmitOpportunityInput = z.infer<typeof SubmitOpportunityInput>;

// ─── submit_opportunity output ────────────────────────────────────────────────

export const SubmitOpportunityOutput = z.object({
    submissionId: z.string().describe('Internal submission id'),
    slug: z.string().nullable().describe('Generated slug, null if the opportunity already existed'),
    status: z.enum(['PENDING_REVIEW', 'PUBLISHED']).describe('Current moderation state'),
    published: z.boolean().describe('true only when the opportunity is live on FresherFlow'),
    message: z.string().describe('Human-readable status message'),
});

export type SubmitOpportunityOutput = z.infer<typeof SubmitOpportunityOutput>;
