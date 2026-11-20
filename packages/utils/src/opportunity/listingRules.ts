import { EmploymentType } from '@fresherflow/types';

/**
 * The content rules for a listing, in one place.
 *
 * These are the rules an agent previously only read in a tool description.
 * Prose is not enforcement: a submission could carry a placeholder salary, a
 * duplicated skill list, an unknown employment type or a country-sized
 * "location" and still be stored. Every write path that can publish calls this
 * function, so the same field rules apply to a community submission, an MCP
 * listing and an edit.
 *
 * The rules are deliberately deterministic. Anything that needs judgement
 * ("is this description good?") stays a moderator decision; anything that can
 * be decided from the value itself ("does this salary contain a figure?") is
 * enforced here.
 */

export interface ListingContentInput {
    title?: string | null;
    company?: string | null;
    description?: string | null;
    locations?: string[] | null;
    salaryRange?: string | null;
    stipend?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    experienceMin?: number | null;
    experienceMax?: number | null;
    notesHighlights?: string | null;
    requiredSkills?: string[] | null;
    employmentTypes?: string | string[] | null;
    category?: string | null;
    dates?: string[] | null;
    expiresAt?: string | null;
    workMode?: string | null;
    companyWebsite?: string | null;
}

export interface ListingContentIssue {
    field: string;
    message: string;
}

/** Values that are never real content, in any field. */
const PLACEHOLDER_VALUES = new Set([
    'n/a', 'na', 'n.a.', 'none', 'null', 'nil', 'unknown', 'tbd', 'tba',
    'not specified', 'not available', 'to be decided', '-', '--', '...',
]);

/** Titles that describe a slot, not a job. */
const PLACEHOLDER_TITLES = new Set([
    'job', 'job opening', 'opening', 'vacancy', 'hiring', 'new job',
    'position', 'opportunity', 'role',
]);

/** Strings that describe a client relationship or a guess, not an employer. */
const NON_EMPLOYER_NAMES = new Set([
    'one of our clients', 'our client', 'a client', 'client', 'confidential',
    'leading company', 'reputed company', 'reputed mnc', 'mnc', 'job board',
    'various', 'multiple companies', 'direct client',
]);

/** Phrases that are explicitly NOT a salary figure. */
const SALARY_WITHOUT_FIGURE = new Set([
    'competitive', 'competitive salary', 'as per standards',
    'as per company standards', 'as per industry standards',
    'best in industry', 'best in the industry', 'negotiable',
    'attractive package', 'market standard', 'market standards',
    'good salary', 'decent salary', 'based on experience',
]);

/** Location aliases that belong in `workMode`, not in `locations`. */
const REMOTE_LOCATION_ALIASES = new Set([
    'remote', 'work from home', 'wfh', 'anywhere', 'pan india', 'work from anywhere',
]);

/** Test fixture shapes, rejected on every write path (not only MCP submit). */
const TEST_PATTERNS = [
    /test[-\s_]?mcp/i,
    /delete\s*me/i,
    /do\s*not\s*publish/i,
    /^testco(\s|$)/i,
    /^testgovt(\s|$)/i,
] as const;

const MAX_SKILLS = 30;
const MIN_DESCRIPTION_LENGTH = 80;
const NOTES_MAX_RATIO = 0.25;
const MAX_LOCATION_LENGTH = 60;

function norm(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasLetter(value: string): boolean {
    return /[a-zA-Z]/.test(value);
}

function hasDigit(value: string): boolean {
    return /[0-9]/.test(value);
}

function looksLikeUrl(value: string): boolean {
    return /:\/\//.test(value) || /\bwww\./i.test(value);
}

function matchesTestPattern(value: string): boolean {
    // Bounded before matching: these values come from user input.
    const bounded = value.slice(0, 200);
    return TEST_PATTERNS.some((pattern) => pattern.test(bounded));
}

function isPlaceholder(value: string): boolean {
    return PLACEHOLDER_VALUES.has(norm(value));
}

/** Split the same way `normaliseEmploymentTypes` does, so validation and storage agree. */
function employmentTypeValues(input: string | string[] | null | undefined): string[] {
    if (!input) return [];
    const raw = Array.isArray(input) ? input : input.split(/[,/|]/);
    return raw
        .map((piece) => piece.trim().toUpperCase().replace(/[\s-]+/g, '_'))
        .filter(Boolean);
}

const VALID_EMPLOYMENT_TYPES = new Set<string>(Object.values(EmploymentType));

/**
 * Every rule that can be decided from the value itself.
 *
 * Returns an empty array when the listing is acceptable. Callers decide what to
 * do with the issues — the community path rejects, `publishCandidate` records a
 * hold — but the rules themselves have one home.
 */
export function validateListingContent(input: ListingContentInput): ListingContentIssue[] {
    const issues: ListingContentIssue[] = [];

    const title = input.title?.trim() ?? '';
    const company = input.company?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    const notes = input.notesHighlights?.trim() ?? '';

    // ── Title ────────────────────────────────────────────────────────────────
    if (!title) {
        issues.push({ field: 'title', message: 'title is required' });
    } else {
        if (title.length < 2) {
            issues.push({ field: 'title', message: 'title must be at least 2 characters' });
        }
        if (!hasLetter(title)) {
            issues.push({ field: 'title', message: 'title must contain words, not only numbers or symbols' });
        }
        if (PLACEHOLDER_TITLES.has(norm(title)) || isPlaceholder(title)) {
            issues.push({
                field: 'title',
                message: 'title is a placeholder ("Job", "Opening", "N/A"). Send the actual role title from the posting.',
            });
        }
        if (matchesTestPattern(title)) {
            issues.push({ field: 'title', message: 'title looks like test data and is rejected' });
        }
        if (company && norm(title) === norm(company)) {
            issues.push({
                field: 'title',
                message: 'title and company are identical — send the role title, not the company name',
            });
        }
    }

    // ── Company ──────────────────────────────────────────────────────────────
    if (!company) {
        issues.push({ field: 'company', message: 'company is required' });
    } else {
        if (PLACEHOLDER_TITLES.has(norm(company)) || isPlaceholder(company)) {
            issues.push({
                field: 'company',
                message: 'company is a placeholder ("Confidential", "N/A", "MNC"). Send the actual employer named in the posting.',
            });
        }
        if (NON_EMPLOYER_NAMES.has(norm(company))) {
            issues.push({
                field: 'company',
                message: 'company must be the actual employer, never "one of our clients", "confidential" or a job board',
            });
        }
        if (matchesTestPattern(company)) {
            issues.push({ field: 'company', message: 'company looks like test data and is rejected' });
        }
    }

    // ── Description ──────────────────────────────────────────────────────────
    if (!description) {
        issues.push({
            field: 'description',
            message: 'description is required — send the role overview, responsibilities and requirements from the posting',
        });
    } else {
        if (description.length < MIN_DESCRIPTION_LENGTH) {
            issues.push({
                field: 'description',
                message: `description must be at least ${MIN_DESCRIPTION_LENGTH} characters; a one-line stub cannot be reviewed or shown to candidates`,
            });
        }
        if (isPlaceholder(description)) {
            issues.push({ field: 'description', message: 'description is a placeholder, not the posting content' });
        }
        if (norm(description) === norm(title) || (company && norm(description) === norm(company))) {
            issues.push({
                field: 'description',
                message: 'description repeats the title or company instead of the posting content',
            });
        }
    }

    // ── Notes / highlights ───────────────────────────────────────────────────
    if (notes) {
        if (isPlaceholder(notes)) {
            issues.push({ field: 'notesHighlights', message: 'notesHighlights is a placeholder; leave it out instead' });
        }
        if (description && notes.length > description.length * NOTES_MAX_RATIO) {
            issues.push({
                field: 'notesHighlights',
                message: `notesHighlights must stay under 25% of the description (${Math.ceil(description.length * NOTES_MAX_RATIO)} chars); move the rest into description`,
            });
        }
    }

    // ── Salary ───────────────────────────────────────────────────────────────
    for (const [field, value] of [
        ['salaryRange', input.salaryRange],
        ['stipend', input.stipend],
    ] as const) {
        if (!value || !value.trim()) continue;
        if (SALARY_WITHOUT_FIGURE.has(norm(value))) {
            issues.push({
                field,
                message: `"${value.trim()}" is not a figure. Only an explicit amount/range belongs here; leave it empty otherwise.`,
            });
        } else if (!hasDigit(value)) {
            issues.push({
                field,
                message: 'a salary must contain a number; leave it empty when the posting states no figure',
            });
        }
    }
    if (
        typeof input.salaryMin === 'number'
        && typeof input.salaryMax === 'number'
        && input.salaryMin > input.salaryMax
    ) {
        issues.push({ field: 'salaryMin', message: 'salaryMin must not be greater than salaryMax' });
    }

    // ── Experience ───────────────────────────────────────────────────────────
    if (
        typeof input.experienceMin === 'number'
        && typeof input.experienceMax === 'number'
        && input.experienceMin > input.experienceMax
    ) {
        issues.push({ field: 'experienceMin', message: 'experienceMin must not be greater than experienceMax' });
    }
    for (const [field, value] of [
        ['experienceMin', input.experienceMin],
        ['experienceMax', input.experienceMax],
    ] as const) {
        if (typeof value === 'number' && (value < 0 || value > 50)) {
            issues.push({ field, message: 'experience must be between 0 and 50 years' });
        }
    }

    // ── Locations ────────────────────────────────────────────────────────────
    for (const location of input.locations ?? []) {
        const value = location.trim();
        if (!value) continue;
        if (isPlaceholder(value)) {
            issues.push({ field: 'locations', message: 'locations contains a placeholder entry; remove it' });
            break;
        }
        if (REMOTE_LOCATION_ALIASES.has(norm(value))) {
            issues.push({
                field: 'locations',
                message: `"${value}" is a work mode, not a city — use workMode REMOTE instead`,
            });
            break;
        }
        if (value.length > MAX_LOCATION_LENGTH) {
            issues.push({
                field: 'locations',
                message: `"${value.slice(0, 40)}…" is too long for a city — send the city only, one entry per city`,
            });
            break;
        }
        if (!hasLetter(value) || looksLikeUrl(value)) {
            issues.push({ field: 'locations', message: `"${value}" is not a location` });
            break;
        }
    }

    // ── Skills ───────────────────────────────────────────────────────────────
    const skills = (input.requiredSkills ?? []).map((skill) => skill.trim()).filter(Boolean);
    if (skills.length > MAX_SKILLS) {
        issues.push({ field: 'requiredSkills', message: `at most ${MAX_SKILLS} skills may be sent` });
    }
    const seenSkills = new Set<string>();
    for (const skill of skills) {
        const key = norm(skill);
        if (isPlaceholder(skill)) {
            issues.push({ field: 'requiredSkills', message: 'remove placeholder skills such as "N/A"' });
            break;
        }
        if (seenSkills.has(key)) {
            issues.push({ field: 'requiredSkills', message: `"${skill}" is listed more than once` });
            break;
        }
        seenSkills.add(key);
    }

    // ── Employment types ─────────────────────────────────────────────────────
    const rawEmploymentTypes = employmentTypeValues(input.employmentTypes);
    if (rawEmploymentTypes.length > 0 && !rawEmploymentTypes.some((value) => VALID_EMPLOYMENT_TYPES.has(value))) {
        issues.push({
            field: 'employmentTypes',
            message: `no recognised employment type in "${String(input.employmentTypes)}"; use ${[...VALID_EMPLOYMENT_TYPES].join(', ')}`,
        });
    }

    // ── Dates ────────────────────────────────────────────────────────────────
    for (const date of input.dates ?? []) {
        if (!date.trim()) continue;
        if (!Number.isFinite(Date.parse(date))) {
            issues.push({ field: 'dates', message: `"${date}" is not a valid date; use YYYY-MM-DD` });
            break;
        }
    }
    if (input.expiresAt && input.expiresAt.trim()) {
        const deadline = Date.parse(input.expiresAt);
        if (!Number.isFinite(deadline)) {
            issues.push({ field: 'expiresAt', message: 'expiresAt is not a valid date; use YYYY-MM-DDTHH:mm or an ISO timestamp' });
        } else if (deadline <= Date.now()) {
            issues.push({ field: 'expiresAt', message: 'expiresAt is in the past — an expired listing cannot be published' });
        }
    }

    // ── Website ──────────────────────────────────────────────────────────────
    if (input.companyWebsite && input.companyWebsite.trim() && !/^https:\/\//i.test(input.companyWebsite.trim())) {
        issues.push({ field: 'companyWebsite', message: 'companyWebsite must use https' });
    }

    return issues;
}

/** One agent-readable line for an API error. */
export function describeListingIssues(issues: ListingContentIssue[]): string {
    return issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ');
}
