import { z } from 'zod';

/**
 * Search-param contract for the admin opportunities list.
 *
 * Next.js App Router adapter of the shadcn-admin `route-search-schema`
 * pattern: raw URL strings are validated once with `safeParse` (never
 * throws — bad URLs fall back to defaults) before they touch list state.
 */

export const ADMIN_OPPORTUNITY_SORT_OPTIONS = [
    'postedAt_desc',
    'postedAt_asc',
    'company_asc',
    'company_desc',
] as const;

export type AdminOpportunitySort = (typeof ADMIN_OPPORTUNITY_SORT_OPTIONS)[number];

export const ADMIN_OPPORTUNITY_DEFAULT_SORT: AdminOpportunitySort = 'postedAt_desc';

/** Upper bound for `page` so absurd values (e.g. `?page=999999999`) cannot produce absurd offsets. */
export const ADMIN_OPPORTUNITY_MAX_PAGE = 100000;

const adminOpportunitySearchParamsSchema = z.object({
    // Raw `type` slug (`job`, `walk-in`, …) — mapped to an enum by
    // `typeParamToEnum` AFTER validation.
    type: z.string().trim().max(40).nullish().catch(null).transform((v) => v ?? ''),
    status: z
        .string()
        .trim()
        .max(30)
        .nullish()
        .catch(null)
        .transform((v) => (v ?? '').toUpperCase()),
    linkHealth: z
        .enum(['HEALTHY', 'RETRYING', 'BROKEN', ''])
        .nullish()
        .catch('')
        .transform((v) => v ?? ''),
    activeOnly: z
        .string()
        .nullish()
        .catch(null)
        .transform((v) => v === 'true'),
    q: z.string().max(200).nullish().catch(null).transform((v) => v ?? ''),
    sort: z
        .enum(ADMIN_OPPORTUNITY_SORT_OPTIONS)
        .nullish()
        .catch(null)
        .transform((v) => v ?? ADMIN_OPPORTUNITY_DEFAULT_SORT),
    page: z
        .coerce.number()
        .catch(1)
        .transform((v) => {
            if (!Number.isFinite(v)) return 1;
            return Math.min(Math.max(Math.floor(v), 1), ADMIN_OPPORTUNITY_MAX_PAGE);
        }),
});

export type AdminOpportunitySearchParams = z.output<typeof adminOpportunitySearchParamsSchema>;

/** Minimal shape of `useSearchParams()` — kept structural so this stays testable without Next.js. */
interface SearchParamReader {
    get(name: string): string | null;
}

/**
 * Validate raw URL search params for the admin opportunities list.
 * Never throws: every invalid value falls back to its default
 * (`?page=abc` → 1, `?sort=drop-table` → `postedAt_desc`).
 */
export function parseAdminOpportunitySearchParams(searchParams: SearchParamReader): AdminOpportunitySearchParams {
    const result = adminOpportunitySearchParamsSchema.safeParse({
        type: searchParams.get('type'),
        status: searchParams.get('status'),
        linkHealth: searchParams.get('linkHealth'),
        activeOnly: searchParams.get('activeOnly'),
        q: searchParams.get('q'),
        sort: searchParams.get('sort'),
        page: searchParams.get('page'),
    });
    if (result.success) return result.data;
    // Unreachable in practice (every field has a catch/default), but keeps
    // the "never throw on bad URLs" guarantee structural, not incidental.
    return {
        type: '',
        status: '',
        linkHealth: '',
        activeOnly: false,
        q: '',
        sort: ADMIN_OPPORTUNITY_DEFAULT_SORT,
        page: 1,
    };
}
