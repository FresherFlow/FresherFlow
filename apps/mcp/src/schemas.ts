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
        .describe('Job or internship title from the posting, 1-200 chars. Must contain words. Rejected: placeholders ("Job", "Opening", "N/A"), test names ("TestCo", "DELETE ME") and a title identical to the company name.'),
    companyName: z.string().trim().min(1, 'companyName is required').max(200)
        .describe('The actual employer named in the posting, 1-200 chars. Rejected: "N/A", "Unknown", "MNC", "Confidential", "One of our clients", "A client", "Reputed company" and job-board names.'),
    jobUrl: z.string().trim().url('jobUrl must be a valid URL').max(2000)
        .describe('Official job posting URL, HTTPS only, max 2000 chars. Stored as data only — FresherFlow never fetches it, so read the posting yourself.'),
    location: z.string().trim().max(120).optional()
        .describe('Single-city alias for `locations`, max 120 chars, e.g. "Hyderabad". Required unless workMode is REMOTE. Prefer `locations` when the posting names more than one city. Never send "Remote" or "WFH" here — that is workMode.'),
    locations: z.array(z.string().trim().min(1).max(120)).max(15).optional()
        .describe('Every city the posting names, one entry each, e.g. ["Hyderabad", "Bangalore"]. City only — never state/country ("Hyderabad Telangana India"). Never put "Hyderabad and Bangalore" in one entry. "Remote"/"WFH" is a workMode, not a city, and is rejected here.'),
    employmentType: z.string().trim().max(80).optional()
        .describe('Employment type, max 80 chars, e.g. "Full-time", "Internship", "Full-time, Internship". Must contain at least one recognised enum value (FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, FREELANCE, INTERNSHIP, APPRENTICESHIP, VOLUNTEER, PER_DIEM, OTHER) — an unknown value is rejected with a 400, not dropped.'),
    /** Alias so an agent that guesses the plural name is not silently stripped. */
    employmentTypes: z.string().trim().max(80).optional()
        .describe('Alias of employmentType. Send only one of the two. Same rule: max 80 chars and at least one recognised enum value; an unrecognised value is a 400.'),
    category: z.enum(['job', 'internship', 'walkin', 'government']).optional()
        .describe('Posting kind. Use "walkin" for dated drives (add dates/venueAddress), "government" for public-sector jobs. Defaults to "job".'),
    dates: z.array(z.string().trim().max(40)).max(10).optional()
        .describe('Walk-in dates, max 10 entries of 40 chars, e.g. ["2026-10-04"]. Required for category "walkin": at least one must be a real date, or the submission is rejected.'),
    dateRange: z.string().trim().max(120).optional()
        .describe('Walk-in date range text, e.g. "4th - 5th Oct". Only used with category "walkin".'),
    timeRange: z.string().trim().max(120).optional()
        .describe('Walk-in reporting time, e.g. "10am - 2pm". Only used with category "walkin".'),
    venueAddress: z.string().trim().max(500).optional()
        .describe('Walk-in venue, max 500 chars. Required when category is "walkin": without it the server stores the literal "Venue shared after apply", so the submission is rejected instead.'),
    salary: z.string().trim().max(60).optional()
        .describe('Salary as stated in the posting, max 60 chars, e.g. "₹5–7 LPA". Must contain a figure. Rejected: "Competitive", "As per standards", "Best in industry", "Negotiable", "Attractive package". Leave empty when the posting states no amount.'),
    description: z.string().trim().min(80, 'description must be at least 80 characters').max(5000)
        .describe('Required, 80-5000 chars: the role overview, responsibilities and requirements from the posting. Most of the useful job information belongs in this field. Copy from the posting; never invent facts. If you cannot read the posting, ask the user to paste it instead of submitting a stub.'),
    eligibility: z.string().trim().max(2000).optional()
        .describe('Eligibility: degrees, courses, pass-out years. Send it in the source posting\'s own words — it is parsed into structured eligibility, so the listing is still filterable by degree and batch.'),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).optional()
        .describe('Required skills, one entry each, e.g. ["React", "TypeScript"]. Max 30. Read them off the posting; do not invent. Duplicates (including case-only, "React" vs "react") and placeholders like "N/A" are rejected.'),
    passoutYears: z.array(z.number().int().min(1990).max(2100)).max(15).optional()
        .describe('Eligible graduation years as numbers, e.g. [2025, 2026]. Use only when the posting states them, and spell out a range rather than sending it as text.'),
    sourceUrl: z.string().trim().url('sourceUrl must be a valid URL').max(2000).optional()
        .describe('Only when the posting was found at a different URL than the apply link. Normally omit: jobUrl is used for both.'),
    contactEmail: z.string().trim().email('contactEmail must be valid').max(200).optional()
        .describe('Optional contact email for follow-up'),
    companyWebsite: z.string().trim().url('companyWebsite must be a valid URL').max(2000).optional()
        .describe('Company website from the posting, HTTPS only (http:// is rejected). Leave out when the posting does not state one.'),
    companyLogoUrl: z.string().trim().url('companyLogoUrl must be a valid URL').max(2000).optional()
        .describe('Company logo URL, only when the posting states one. Never construct or guess one.'),
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
    // ── Education set ───────────────────────────────────────────────────────
    // The listing filters read all four: level buckets, degree names, branches
    // and exact pass-out years. `eligibility` is only parsed into degrees and
    // pass-out years when the structured values are absent, so an agent that read
    // the posting should send these explicitly rather than rely on the parser.
    allowedDegrees: z.array(z.enum(['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'])).max(10).optional()
        .describe('Eligibility level buckets: TENTH, INTER, DIPLOMA, DEGREE, PG. These are buckets, not degree names — "B.Tech" belongs in allowedCourses.'),
    allowedCourses: z.array(z.string().trim().min(1).max(80)).max(20).optional()
        .describe('Degree names from the posting, e.g. ["B.Tech", "B.Sc", "MCA"].'),
    allowedSpecializations: z.array(z.string().trim().min(1).max(80)).max(20).optional()
        .describe('Branch or specialization names, e.g. ["Computer Science", "Mechanical"].'),
    stipend: z.string().trim().max(120).optional()
        .describe('Internship stipend as stated, e.g. "₹20,000/month". Never guess.'),
    incentives: z.string().trim().max(500).optional()
        .describe('Real benefits stated in the posting (insurance, cab, shift allowance, PPO, meals). Never copy culture statements.'),
    selectionProcess: z.string().trim().max(5000).optional()
        .describe('Selection rounds as stated, e.g. "Online test → Technical interview → HR". Only when the posting describes them.'),
    notesHighlights: z.string().trim().max(5000).optional()
        .describe('Genuine callouts only: shift timing, bond, immediate joiner, own laptop, walk-in details, joining deadline. Never responsibilities, requirements or skills. Must stay under 25% of the description length; longer is a 400.'),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional()
        .describe('Short discovery tags from the posting, e.g. ["Fresher", "Remote"]. Do not invent.'),
    salaryMin: z.number().int().min(0).nullable().optional()
        .describe('Numeric minimum pay, only when the posting states a figure. Normally use `salary` instead.'),
    salaryMax: z.number().int().min(0).nullable().optional()
        .describe('Numeric maximum pay, only when the posting states a figure. Normally use `salary` instead.'),
    venueLink: z.union([z.string().trim().url('venueLink must be a valid URL'), z.literal('')]).optional()
        .describe('Map link for the walk-in venue, only when the posting provides one.'),
    reportingTime: z.string().trim().max(120).optional()
        .describe('Walk-in reporting time, e.g. "10:00" (24-hour) or "10am". Only used with category "walkin".'),
    applicationDetails: z.object({
        method: z.enum(['DIRECT', 'FORM', 'ASSESSMENT']).optional(),
        platform: z.string().trim().max(120).optional(),
        estimatedMinutes: z.number().int().positive().optional(),
        requiredItems: z.array(z.string().trim().max(120)).max(20).optional(),
    }).nullable().optional()
        .describe('How the candidate applies. Use null for a direct jobUrl redirect; use FORM/ASSESSMENT only when a form or test is actually involved.'),
    expiresAt: z.string().trim().max(40).optional()
        .describe('Application deadline as ISO datetime (YYYY-MM-DDTHH:mm) or timestamp, only when stated. Must parse and must be in the future — an invalid or past date is a 400.'),
// Reject unknown keys instead of dropping them. A misspelled field used to
// disappear with no error, which is how a submission arrived with a title and
// nothing else.
}).strict().superRefine((data, ctx) => {
    if (!/^https:\/\//i.test(data.jobUrl)) {
        ctx.addIssue({ code: 'custom', path: ['jobUrl'], message: 'jobUrl must use https' });
    }
    if (data.sourceUrl && !/^https:\/\//i.test(data.sourceUrl)) {
        ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl must use https' });
    }
    // Mirrors the API's minimum-completeness gate (`mcpSubmitOpportunitySchema`)
    // so the agent gets the same, actionable error before a round trip. The API
    // remains authoritative — never rely on this check alone. `description` is
    // required at the field level above, so it shows up as required in the
    // tool's inputSchema rather than only failing at call time.
    const hasLocation = (data.locations?.some((value) => value.trim().length > 0) ?? false)
        || Boolean(data.location?.trim());
    if (!hasLocation && data.workMode !== 'REMOTE') {
        ctx.addIssue({
            code: 'custom',
            path: ['locations'],
            message: 'locations is required (one entry per city) unless the posting is remote (workMode REMOTE).',
        });
    }
    if (data.category === 'walkin') {
        if (!(data.dates ?? []).some((value) => Number.isFinite(Date.parse(value)))) {
            ctx.addIssue({
                code: 'custom',
                path: ['dates'],
                message: 'category "walkin" requires at least one real drive date in `dates` (YYYY-MM-DD).',
            });
        }
        if (!data.venueAddress || data.venueAddress.trim().length < 5) {
            ctx.addIssue({
                code: 'custom',
                path: ['venueAddress'],
                message: 'category "walkin" requires the real venueAddress.',
            });
        }
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
    /** Details the posting normally states that this call did not send. */
    missingFields: z.array(z.string()).optional().describe(
        'Fields the posting normally states that were not sent, e.g. salary, skills, eligibility. '
        + 'Ask the user or re-read the posting for them; never invent values.',
    ),
    message: z.string().describe('Human-readable status message'),
});

export type SubmitOpportunityOutput = z.infer<typeof SubmitOpportunityOutput>;

// ─── full-listing payload (update_listing) ───────────────────────────────────
/**
 * The full-listing write contract lives here, not in the tool description.
 * Field rules are in `.describe()` so the agent sees them alongside each field.
 * Values stay `unknown` on purpose: the API's `opportunitySchema` is the type
 * authority, and a local guess must never reject a payload the API accepts.
 * Unknown keys pass through so a new API field is not blocked by an old tool.
 */
export const ListingPayload = z.object({
    title: z.unknown().optional().describe('Required. Job title from the listing.'),
    company: z.unknown().optional().describe('Required. The actual hiring company, not a job board or "confidential".'),
    requiredSkills: z.unknown().optional().describe('Required. Skills array, one skill per entry.'),
    category: z.unknown().optional().describe('"job" | "internship" | "walk-in". Not the admin form\'s "type" key.'),
    status: z.unknown().optional().describe('DRAFT | PUBLISHED | ARCHIVED. EXPIRED is not accepted. PUBLISHED triggers alerts.'),
    description: z.unknown().optional().describe('Role overview, responsibilities and requirements. Carries 80-90% of the useful content.'),
    companyWebsite: z.unknown().optional().describe('HTTPS company website from the posting.'),
    companyLogoUrl: z.unknown().optional().describe('Logo URL only when the posting states one.'),
    locations: z.unknown().optional().describe('City names only, one entry per city. Never state or country in an entry.'),
    workMode: z.unknown().optional().describe('ONSITE | HYBRID | REMOTE. "Remote" must not be put in locations.'),
    salaryRange: z.unknown().optional().describe('Salary as stated. Must contain a figure; phrases like "competitive" are rejected.'),
    salaryMin: z.unknown().optional().describe('Numeric salary floor, only from an explicit figure.'),
    salaryMax: z.unknown().optional().describe('Numeric salary ceiling, only from an explicit figure.'),
    salaryPeriod: z.unknown().optional().describe('MONTHLY | YEARLY. Internship stipend uses stipend instead.'),
    stipend: z.unknown().optional().describe('Internship stipend as stated. Never guessed.'),
    incentives: z.unknown().optional().describe('Real benefits only — insurance, cab, allowance, bonus, PPO. Never culture statements.'),
    employmentTypes: z.unknown().optional().describe('Comma-separated enum string, e.g. "FULL_TIME,INTERNSHIP". Unknown values are dropped by the API.'),
    experienceMin: z.unknown().optional().describe('Minimum years, only when stated or directly derivable.'),
    experienceMax: z.unknown().optional().describe('Maximum years, only when stated or directly derivable.'),
    jobFunction: z.unknown().optional().describe('Job function or domain from the listing.'),
    selectionProcess: z.unknown().optional().describe('Selection rounds as stated.'),
    notesHighlights: z.unknown().optional().describe('Genuine callouts only, under 25% of description. Never responsibilities or skills.'),
    tags: z.unknown().optional().describe('Short discovery tags.'),
    allowedDegrees: z.unknown().optional().describe('Level buckets: TENTH | INTER | DIPLOMA | DEGREE | PG. Not degree names.'),
    allowedCourses: z.unknown().optional().describe('Degree names, e.g. B.Tech, MCA.'),
    allowedSpecializations: z.unknown().optional().describe('Branches, e.g. Computer Science, Mechanical.'),
    allowedPassoutYears: z.unknown().optional().describe('Exact eligible graduation years as numbers.'),
    passoutYearMin: z.unknown().optional().describe('Lower bound of an eligible graduation-year range.'),
    passoutYearMax: z.unknown().optional().describe('Upper bound of an eligible graduation-year range.'),
    allowedAvailability: z.unknown().optional().describe('IMMEDIATE | DAYS_15 | MONTH_1.'),
    applyLink: z.unknown().optional().describe('Direct application URL, not a careers homepage. Required unless the listing is a walk-in.'),
    sourceLink: z.unknown().optional().describe('Where the posting was found, when different from applyLink.'),
    expiresAt: z.unknown().optional().describe('Deadline as ISO datetime. Must parse and be in the future.'),
    customSlug: z.unknown().optional().describe('Custom URL slug.'),
    applicationDetails: z.unknown().optional().describe('null for a direct applyLink redirect, otherwise { method: DIRECT | FORM | ASSESSMENT, platform, estimatedMinutes, requiredItems[] }.'),
    driveDetails: z.unknown().optional().describe('Walk-in details: dates[], dateRange, timeRange, reportingTime, venueAddress, venueLink, city, requiredDocuments[], contactPerson, contactPhone.'),
    sector: z.unknown().optional().describe('PRIVATE | GOVERNMENT | NGO | ACADEMIC | STARTUP | OTHER. Use GOVERNMENT with governmentJobDetails.'),
    governmentJobDetails: z.unknown().optional().describe('Government post details: department, organization, recruitingBody, postName, vacancyCount, applicationStartDate, applicationEndDate, officialWebsiteUrl, officialNotificationUrl, ...'),
}).passthrough();

export type ListingPayload = z.infer<typeof ListingPayload>;
