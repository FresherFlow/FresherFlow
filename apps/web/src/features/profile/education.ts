/**
 * Non-UI code for the Education section.
 *
 * The college result shape, the search endpoint contract and the timeline derivation. The
 * section renders this; it does not define it.
 */
import type { Profile } from '@fresherflow/types';

/**
 * One row from `/api/colleges/search`.
 *
 * Note: the same shape is declared inline in `app/api/colleges/search/route.ts`. That is the
 * next thing to unify — a single `CollegeItem` in `@fresherflow/types` — but this module is the
 * web-side home until then, so no component has to own it.
 */
export interface CollegeItem {
    id?: string;
    name: string;
    district?: string;
    type?: string;
    state?: string;
}

export const COLLEGE_SEARCH_LIMIT = 15;
/** Below this many characters a name search is too loose to be useful. */
export const COLLEGE_SEARCH_MIN_CHARS = 2;
export const COLLEGE_SEARCH_DEBOUNCE_MS = 150;

export function buildCollegeSearchUrl(nameQuery: string, state: string): string | null {
    const trimmed = nameQuery.trim();
    if (!state && trimmed.length < COLLEGE_SEARCH_MIN_CHARS) return null;

    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (state) params.set('state', state);
    params.set('limit', String(COLLEGE_SEARCH_LIMIT));
    return `/api/colleges/search?${params.toString()}`;
}

export interface EducationTimelineItem {
    title: string;
    sub?: string | null;
    yr: number | string | null | undefined;
    /** The badge text: Postgrad / Undergrad / Diploma / School. */
    b: string;
}

/**
 * Build the read-only timeline from the saved profile.
 *
 * `draft` supplies the in-editor values, because the form state can be ahead of the cached
 * profile while an edit is open.
 */
export function buildEducationTimeline(
    profile: Profile | null,
    draft: { collegeName?: string; gradSpecialization?: string } = {},
): EducationTimelineItem[] {
    const items: EducationTimelineItem[] = [];

    if (profile?.pgCourse) {
        items.push({
            title: profile.pgCourse,
            sub: profile.pgSpecialization,
            yr: profile.pgYear,
            b: 'Postgrad',
        });
    }

    if (profile?.gradCourse) {
        items.push({
            title: profile.gradCourse,
            sub: [profile.collegeName || draft.collegeName, profile.gradSpecialization || draft.gradSpecialization]
                .filter(Boolean)
                .join(' • '),
            yr: profile.gradYear,
            b: profile.educationLevel === 'DIPLOMA' ? 'Diploma' : 'Undergrad',
        });
    }

    if (profile?.twelfthYear) {
        items.push({ title: '12th / Inter', yr: profile.twelfthYear, b: 'School' });
    }
    if (profile?.tenthYear) {
        items.push({ title: '10th Class', yr: profile.tenthYear, b: 'School' });
    }

    return items;
}

/** Which degree list the course picker offers for a given education level. */
export function isDiplomaLevel(educationLevel: string | null | undefined): boolean {
    return educationLevel === 'DIPLOMA';
}
