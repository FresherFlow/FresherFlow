// Title-date staleness + bare-form detection (P1 #1, Gates 3+4).
//
// Pure functions (no browser, no network) so they are unit-testable and usable
// from both the verifier and any future save-time gate. Design principle:
// strong date evidence decides alone; weak/absent evidence never does.

export interface TitleDate {
    year: number;
    /** 1-12 when the title carries month precision, otherwise null (year-only). */
    month: number | null;
}

const MONTHS: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
    dec: 12, december: 12,
};

/** Months older than this ==> a month-precision title date is stale. */
export const STALE_TITLE_MONTHS = 18;

/**
 * Extract the strongest date signal from a job title. Handles:
 * - "Internship-Jan'24", "Jan 2024", "January'2026" (month precision)
 * - "2023/2024 Batch", "2023-2025" (batch range -> max year, year-only)
 * - bare years ("Hiring 2023") (year-only)
 * Returns null when the title carries no date signal at all.
 */
export function findTitleDate(title: string): TitleDate | null {
    if (!title) return null;
    const t = title.toLowerCase();

    // Month + year first (strongest): Jan'24, Jan 2024, January'2026, Sep-2025
    const m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*['’\-.]?\s*(\d{2,4})\b/);
    if (m) {
        let year = parseInt(m[2], 10);
        if (year < 100) year += year < 50 ? 2000 : 1900;
        if (year >= 1990 && year <= 2100) {
            return { year, month: MONTHS[m[1].slice(0, 3)] ?? MONTHS[m[1]] ?? null };
        }
    }

    // Batch ranges: 2023/2024, 2023-2025 -> max endpoint, year-only precision
    const years: number[] = [];
    const range = t.match(/\b((?:19|20)\d{2})\s*[/\-–]\s*((?:19|20)?\d{2})\b/);
    if (range) {
        let end = parseInt(range[2], 10);
        if (end < 100) {
            const startCentury = Math.floor(parseInt(range[1], 10) / 100) * 100;
            end += startCentury;
        }
        years.push(end);
    }
    // Bare years, excluding headcount phrasing ("Hiring 2000 Freshers" is a
    // headcount, not a year — the trailing role noun gives it away).
    for (const m of t.matchAll(/\b((?:19|20)\d{2})\b(?!\s*(?:freshers?|engineers?|hires?|openings?|positions?|roles?|jobs?|vacanc\w*|people|candidates?)\b)/g)) {
        years.push(parseInt(m[1], 10));
    }
    if (years.length > 0) {
        return { year: Math.max(...years), month: null };
    }
    return null;
}

/**
 * Strong stale verdicts only:
 * - month-precision date older than STALE_TITLE_MONTHS ==> stale.
 * - year-only ==> stale only when year <= currentYear - 2 (a lone recent year
 *   like "2025" is weak evidence and must NOT decide alone).
 */
export function isStaleDate(d: TitleDate, now: Date = new Date(), thresholdMonths: number = STALE_TITLE_MONTHS): boolean {
    if (d.month !== null) {
        const monthsOld = (now.getFullYear() - d.year) * 12 + (now.getMonth() + 1 - d.month);
        return monthsOld > thresholdMonths;
    }
    return d.year <= now.getFullYear() - 2;
}

const FORM_STOPWORDS = new Set([
    'walkin', 'walk', 'form', 'forms', 'apply', 'application', 'applications',
    'hiring', 'drive', 'drives', 'registration', 'register', 'registrations',
    'link', 'portal', 'online',
]);

/**
 * True when a form title carries no substantive tokens beyond form boilerplate.
 * "WalkIn Form" ==> bare. "Java Developer WalkIn Form" ==> NOT bare (role
 * tokens present) — per policy a substantive title alone is never proof of junk.
 * ALL-CAPS acronyms (HR/IT/QA/UI) count as substantive: "HR Form" is not bare.
 */
export function isBareFormTitle(title: string): boolean {
    if (!title) return true;
    const rawTokens = title.split(/[^A-Za-z0-9]+/).filter(Boolean);
    const tokens = rawTokens.filter(t => {
        if (/^[A-Z]{2,4}$/.test(t)) return true; // acronym role (HR/IT/QA)
        const l = t.toLowerCase();
        return l.length > 2 && !FORM_STOPWORDS.has(l);
    });
    return tokens.length === 0;
}

/** Hosts whose pages are application forms (legit channel — gated, never blocked outright). */
export function isFormHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === 'docs.google.com' || h.endsWith('.docs.google.com') ||
        h === 'forms.gle' || h.endsWith('.forms.gle');
}

export type FormVerdict = 'ok' | 'stale' | 'bare';

/**
 * Pure staleness/provenance classifier (unit-tested). Policy:
 * - stale: a strong date in the page title, else the wrapper title, is older
 *   than the threshold — decides alone.
 * - bare: form host + boilerplate-only page title + no date anywhere + a
 *   wrapper that is itself empty/bare. A rich wrapper ("TCS Java Walk-in")
 *   or a substantive form title ("Java Developer WalkIn Form") never dies here.
 * - ok: everything else (weak or absent signals must not decide alone).
 */
export function classifyFormCandidate(args: {
    applyLink: string;
    jobTitle: string;
    aggregatorTitle?: string;
    now?: Date;
}): { verdict: FormVerdict; detail: string } {
    const now = args.now ?? new Date();
    const pageDate = findTitleDate(args.jobTitle);
    const wrapperDate = findTitleDate(args.aggregatorTitle || '');
    const staleDate = pageDate ?? wrapperDate;
    if (staleDate && isStaleDate(staleDate, now)) {
        const from = pageDate ? 'page title' : 'wrapper title';
        return { verdict: 'stale', detail: `${staleDate.month ?? ''}/${staleDate.year} from ${from}` };
    }
    let host = '';
    try { host = new URL(args.applyLink).hostname; } catch {}
    const wrapperBare = !args.aggregatorTitle || isBareFormTitle(args.aggregatorTitle);
    if (!staleDate && isFormHost(host) && isBareFormTitle(args.jobTitle) && wrapperBare) {
        return { verdict: 'bare', detail: args.jobTitle };
    }
    return { verdict: 'ok', detail: '' };
}
