import type { Opportunity } from '@fresherflow/types';

/**
 * The batches an opportunity *declares*.
 *
 * One home for the rule, because four surfaces read it and they have to agree:
 * the feed filter (`filterOpportunities`), the filter-panel facet counts
 * (`countFilterFacets`), the profile-mismatch layer (`useProfileFilters`) and the
 * SEO taxonomy matcher (`taxonomy/matchers`). They had four different copies and
 * three different answers, so the same listing could be visible in the feed and
 * simultaneously reported as a profile mismatch.
 *
 * A listing states its batches as an explicit `allowedPassoutYears` list, or as
 * a `passoutYearMin`/`passoutYearMax` range. When it states neither, it declares
 * nothing — and a listing that declares nothing matches every batch, which is
 * why every caller tests `length === 0` before trusting an `includes`.
 *
 * Text is deliberately NOT sniffed here. The feed filter used to scan the title
 * for a year, which only ever invented exclusions for listings that never stated
 * a batch. `resolvePassoutYears` in `jobCardUtils` adds a separate, clearly
 * labelled display fallback for the card chip — display may infer, filtering
 * must not.
 */
export function getDeclaredPassoutYears(opp: Opportunity): number[] {
    const allowed = (opp.allowedPassoutYears ?? [])
        .map((year) => Number(year))
        .filter((year) => Number.isFinite(year));
    if (allowed.length > 0) {
        return Array.from(new Set(allowed)).sort((a, b) => a - b);
    }

    const min = Number(opp.passoutYearMin);
    const max = Number(opp.passoutYearMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return [];

    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/**
 * True when the listing accepts this batch. A listing that declares no batch
 * accepts all of them — the server's `allowedPassoutYears IS EMPTY` rule.
 */
export function matchesDeclaredPassoutYear(opp: Opportunity, year: number | null | undefined): boolean {
    if (year === null || year === undefined) return true;
    const declared = getDeclaredPassoutYears(opp);
    return declared.length === 0 || declared.includes(Number(year));
}
