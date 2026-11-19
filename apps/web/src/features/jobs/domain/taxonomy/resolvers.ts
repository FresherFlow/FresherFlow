import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/jobs/utils/locationUtils';
import {
    TAXONOMY_BOARD_SUFFIX,
    titleCaseSlug,
    yearBoardSlug,
} from './constants';
import type { TaxonomyRegistry, ResolvedTaxonomy } from './constants';

/** Canonicalize an incoming URL param into a registry slug (or empty string). */
export function normalizeTaxonomySlug(raw: string): string {
    return slugify(decodeURIComponent(raw));
}

/** Role, city and skill board URLs end in `-jobs`. Years do not. */
export function resolveTaxonomySlug(registry: TaxonomyRegistry, rawSlug: string): ResolvedTaxonomy | null {
    const slug = normalizeTaxonomySlug(rawSlug);
    if (!slug) return null;

    // Year batch boards: `/jobs/2026-batch` (canonical, unsuffixed).
    // The URL shape is the contract; the board still renders when the feed
    // has no matching jobs, so it shows its empty state instead of a 404.
    const yearMatch = /^(\d{4})-batch$/.exec(slug);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        return { kind: 'year', slug: yearBoardSlug(year), label: `${year} Batch`, year };
    }

    // Canonical board URLs for role/city/skill end in `-jobs`.
    if (slug.endsWith(TAXONOMY_BOARD_SUFFIX)) {
        const base = slug.slice(0, -TAXONOMY_BOARD_SUFFIX.length);
        if (!base) return null;

        const role = registry.roles.get(base);
        if (role) return { kind: 'role', slug: base, label: role.label, item: role };

        const city = registry.cities.get(base);
        if (city) return { kind: 'city', slug: base, label: city.label, item: city };

        const skill = registry.skills.get(base);
        if (skill) return { kind: 'skill', slug: base, label: skill.label, item: skill };

        // A `-jobs` URL is a board even when the feed has too few jobs to
        // register it. Let the page show "no jobs here" with a way onward.
        const location = VALID_LOCATIONS[base as keyof typeof VALID_LOCATIONS];
        if (location || getCanonicalLocation(base)) {
            const label = titleCaseSlug(base);
            return { kind: 'city', slug: base, label, item: { slug: base, label, count: 0 } };
        }
        const label = titleCaseSlug(base);
        return { kind: 'role', slug: base, label, item: { slug: base, label, count: 0 } };
    }

    // Unsuffixed namespace belongs to job-detail. Anything that is not a
    // `-jobs` board or a `-batch` year is not a board at all.
    return null;
}

/** Canonical URL slug for a resolved board (`-jobs` suffixed, except years). */
export function boardCanonicalSlug(resolved: ResolvedTaxonomy): string {
    switch (resolved.kind) {
        case 'year':
            return resolved.slug;
        default:
            return `${resolved.slug}${TAXONOMY_BOARD_SUFFIX}`;
    }
}

/**
 * Build-time collision assertion: registry board URLs ∩ job-detail slugs = ∅.
 * The `/jobs/[slug]` route must never be ambiguous. Throws on conflict so the
 * build fails loudly (doc 22 §22.3 acceptance).
 */
export function assertRegistryJobSlugCollision(
    registry: TaxonomyRegistry,
    jobSlugs: Set<string>,
): void {
    const registrySlugs = new Set<string>();
    for (const slug of registry.roles.keys()) {
        registrySlugs.add(slug);
        registrySlugs.add(`${slug}${TAXONOMY_BOARD_SUFFIX}`);
    }
    for (const slug of registry.cities.keys()) {
        registrySlugs.add(slug);
        registrySlugs.add(`${slug}${TAXONOMY_BOARD_SUFFIX}`);
    }
    for (const slug of registry.skills.keys()) {
        registrySlugs.add(slug);
        registrySlugs.add(`${slug}${TAXONOMY_BOARD_SUFFIX}`);
    }
    for (const year of registry.years.keys()) {
        registrySlugs.add(yearBoardSlug(year));
    }

    const conflicts: string[] = [];
    for (const slug of registrySlugs) {
        if (jobSlugs.has(slug)) conflicts.push(slug);
    }
    if (conflicts.length > 0) {
        throw new Error(
            `[taxonomyRegistry] Registry slugs collide with job-detail slugs: ${conflicts.join(', ')}. ` +
            'Rename the registry slug or fix the feed slugs — /jobs/[slug] must be unambiguous.',
        );
    }
}
