/**
 * Phase 13 - payload normalization.
 *
 * Pure functions only: no database, no network. That is what makes the
 * rejection rules testable and lets a connector be re-run against a stored
 * `RawOpportunity.rawPayload` months later without re-fetching.
 *
 * The guiding rule is that ingestion is conservative. A listing it cannot
 * confidently normalize is REJECTED with a reason flag rather than published
 * as a half-empty card, because a wrong listing costs user trust in a way a
 * missing one does not.
 */

import { OpportunityCategory } from '@fresherflow/database';
import type { NormalizedDraft, NormalizationResult, RawItem } from './types';
import { mapCategoryFromText } from './categoryMap';

const MAX_TITLE = 200;
const MAX_COMPANY = 120;
const MAX_DESCRIPTION = 20_000;
const MAX_LOCATIONS = 20;
const MAX_TAGS = 50;

const VALID_CATEGORIES = new Set<string>(Object.values(OpportunityCategory));

function cleanText(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Preserve paragraph breaks, collapse runs of blank lines and stray spaces. */
function cleanDescription(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_DESCRIPTION);
}

function toStringList(value: unknown, maxItems = MAX_TAGS): string[] {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    const out: string[] = [];
    for (const entry of raw) {
        if (typeof entry !== 'string') continue;
        const cleaned = entry.replace(/\s+/g, ' ').trim().slice(0, 100);
        if (cleaned.length > 0 && !out.includes(cleaned)) out.push(cleaned);
        if (out.length >= maxItems) break;
    }
    return out;
}

function toIntList(value: unknown): number[] {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    const out: number[] = [];
    for (const entry of raw) {
        const parsed = typeof entry === 'number' ? entry : Number(String(entry).trim());
        if (!Number.isFinite(parsed)) continue;
        const year = Math.trunc(parsed);
        if (year >= 1950 && year <= 2100 && !out.includes(year)) out.push(year);
    }
    return out;
}

/**
 * Parse a salary figure.
 *
 * Upstream feeds are wildly inconsistent: `"8 LPA"`, `"₹12,00,000 per annum"`,
 * `800000`, `"8-10 LPA"`. Anything not confidently understood returns null
 * rather than a wrong number, because a wrong salary is a trust-breaking bug
 * and a missing one is merely incomplete.
 */
export function parseSalaryToAnnualInr(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    }
    if (typeof value !== 'string') return null;

    const text = value.trim();
    if (text.length === 0 || text.length > 60) return null;

    // Lakhs per annum: the dominant Indian feed format.
    const lpa = /(\d+(?:\.\d+)?)\s*(?:-\s*\d+(?:\.\d+)?)?\s*lpa/i.exec(text);
    if (lpa) {
        return Math.round(Number(lpa[1]) * 100_000);
    }

    // Monthly figure: annualize, since the platform stores an annual range.
    // This must be tested BEFORE the generic rupee rule below, because
    // `"50000 per month"` contains a rupee-looking number and would otherwise
    // be read as 50,000 per annum instead of 600,000.
    const monthly = /(\d[\d,]{3,})\s*(?:\/|per\s+)?\s*(?:month|mo|pm|annum|a\.?p\.?)(?![a-z])/i.exec(text);
    if (/\s*(?:per\s+)?(?:month|mo|pm)\b/i.test(text) && monthly) {
        const parsed = Number(monthly[1].replace(/,/g, ''));
        if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed * 12);
    }

    // Explicit rupee amount, possibly with Indian digit grouping.
    const rupee = /(\d[\d,]{2,})\s*(?:rs\.?|inr|₹)?/i.exec(text);
    if (rupee) {
        const digits = rupee[1].replace(/,/g, '');
        const parsed = Number(digits);
        if (Number.isFinite(parsed) && parsed > 0) {
            // A bare 8 or 8.5 in feed data means lakhs, not rupees.
            if (parsed < 1000) return Math.round(parsed * 100_000);
            return Math.round(parsed);
        }
    }

    return null;
}

function parseDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normalize one raw item.
 *
 * Rejection rules, in the order they are checked:
 *   - no title            -> unusable, cannot be displayed
 *   - no company          -> unusable, cannot be attributed
 *   - title absurdly long -> truncated rather than rejected
 *   - no listing link     -> suspicious but not fatal; the source endpoint
 *                            itself is recorded as the fallback link
 */
export function normalizeRawItem(
    item: RawItem,
    options: { defaultCategory?: OpportunityCategory; fallbackSourceLink?: string; fallbackCompany?: string } = {}
): NormalizationResult {
    const reasonFlags = new Set<string>(item.reasonFlags ?? []);

    const title = cleanText(item.title, MAX_TITLE);
    // ATS boards (Greenhouse/Lever) omit the employer per listing; the source
    // name is the best available attribution and beats rejecting the row.
    const rawCompany = cleanText(item.company, MAX_COMPANY);
    const fallbackCompany = cleanText(options.fallbackCompany, MAX_COMPANY);
    const company = rawCompany.length > 0 ? rawCompany : fallbackCompany;
    if (rawCompany.length === 0 && fallbackCompany.length > 0) reasonFlags.add('company_inferred');
    const description = cleanDescription(item.description);

    if (title.length === 0) reasonFlags.add('missing_title');
    if (company.length === 0) reasonFlags.add('missing_company');
    if (description.length === 0) reasonFlags.add('empty_description');

    const sourceLink = normalizeLink(item.sourceLink) ?? normalizeLink(options.fallbackSourceLink);
    const applyLink = normalizeLink(item.applyLink);

    if (!sourceLink && !applyLink) reasonFlags.add('missing_link');

    // Fatal: a card with no title or no company is not publishable in any form.
    if (title.length === 0 || company.length === 0) {
        return { ok: false, reasonFlags: [...reasonFlags], draft: null };
    }

    const category =
        item.category && VALID_CATEGORIES.has(item.category)
            ? item.category
            : (mapCategoryFromText(title, description) ??
              options.defaultCategory ??
              OpportunityCategory.EMPLOYMENT);

    const salaryMin = parseSalaryToAnnualInr(item.salaryMin);
    const salaryMaxRaw = parseSalaryToAnnualInr(item.salaryMax);
    // An inverted range is a feed bug; normalize rather than drop the listing.
    const salaryMax =
        salaryMaxRaw === null
            ? null
            : salaryMin !== null && salaryMaxRaw < salaryMin
              ? salaryMin
              : salaryMaxRaw;

    const draft: NormalizedDraft = {
        sourceExternalId:
            typeof item.sourceExternalId === 'string' && item.sourceExternalId.trim().length > 0
                ? item.sourceExternalId.trim().slice(0, 200)
                : null,
        title,
        company,
        description,
        sourceLink,
        applyLink,
        locations: toStringList(item.locations, MAX_LOCATIONS),
        category,
        employmentTypes: toStringList(item.employmentTypes),
        workMode: cleanText(item.workMode, 40) || null,
        experienceLevel: cleanText(item.experienceLevel, 40) || null,
        sector: cleanText(item.sector, 40) || null,
        salaryMin,
        salaryMax,
        salaryPeriod: cleanText(item.salaryPeriod, 20) || null,
        requiredSkills: toStringList(item.requiredSkills),
        allowedDegrees: toStringList(item.allowedDegrees),
        allowedCourses: toStringList(item.allowedCourses),
        allowedSpecializations: toStringList(item.allowedSpecializations),
        allowedPassoutYears: toIntList(item.allowedPassoutYears),
        closesAt: parseDate(item.closesAt),
        reasonFlags: [...reasonFlags],
    };

    return { ok: true, reasonFlags: [...reasonFlags], draft };
}

/**
 * Only http(s) links are kept.
 *
 * A `javascript:` or `data:` link in a scraped listing would otherwise be
 * stored and later rendered as a clickable link in the app.
 */
function normalizeLink(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) return null;
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.toString();
    } catch {
        return null;
    }
}

