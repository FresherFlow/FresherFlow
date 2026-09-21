import { slugify } from '@fresherflow/utils/slugify';
import {
    TAXONOMY_BOARD_SUFFIX,
    yearBoardSlug,
} from './constants';
import type { TaxonomyRegistry, ResolvedTaxonomy } from './constants';

/** Canonicalize an incoming URL param into a registry slug (or empty string). */
export function normalizeTaxonomySlug(raw: string): string {
    return slugify(decodeURIComponent(raw));
}

/** Role, city and skill board URLs end in `-jobs`; years and combos do not. */
export function resolveTaxonomySlug(registry: TaxonomyRegistry, rawSlug: string): ResolvedTaxonomy | null {
    const slug = normalizeTaxonomySlug(rawSlug);
    if (!slug) return null;

    // Year batch boards: `/jobs/2026-batch` (canonical, unsuffixed)
    const yearMatch = /^(\d{4})-batch$/.exec(slug);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (registry.years.has(year)) {
            return { kind: 'year', slug: yearBoardSlug(year), label: `${year} Batch`, year };
        }
        return null;
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

        return null;
    }

    // Unsuffixed namespace: only combos are canonical here (job-detail owns the
    // rest). Legacy unsuffixed board URLs are handled by resolveLegacyBoardSlug.
    const inIndex = slug.indexOf('-in-');
    if (inIndex > 0) {
        const roleSlug = slug.slice(0, inIndex);
        const citySlug = slug.slice(inIndex + 4);
        const combo = registry.combos.get(`${roleSlug}|${citySlug}`);
        if (combo) {
            return {
                kind: 'combo',
                slug,
                label: `${combo.roleLabel} Jobs in ${combo.cityLabel}`,
                combo,
            };
        }
    }

    return null;
}

/**
 * Legacy board URLs 308 to their canonical form. Returns the canonical URL
 * slug, or null when the input is already canonical (suffixed role/city/skill
 * boards, `/jobs/{year}-batch`, combos) or not a board at all.
 */
export function resolveLegacyBoardSlug(registry: TaxonomyRegistry, rawSlug: string): string | null {
    const slug = normalizeTaxonomySlug(rawSlug);
    if (!slug) return null;

    // Legacy suffixed year form: `/jobs/2026-batch-jobs` → canonical `/jobs/2026-batch`.
    const legacyYearMatch = /^(\d{4})-batch-jobs$/.exec(slug);
    if (legacyYearMatch) {
        const year = parseInt(legacyYearMatch[1], 10);
        return registry.years.has(year) ? yearBoardSlug(year) : null;
    }

    if (slug.endsWith(TAXONOMY_BOARD_SUFFIX)) return null; // canonical role/city/skill

    // `/jobs/{year}-batch` is canonical — never redirect it (loop guard).
    if (/^(\d{4})-batch$/.test(slug)) return null;

    // Combos are canonical unsuffixed — never redirect them.
    const inIndex = slug.indexOf('-in-');
    if (inIndex > 0) {
        if (registry.combos.get(`${slug.slice(0, inIndex)}|${slug.slice(inIndex + 4)}`)) return null;
    }

    if (registry.roles.has(slug) || registry.cities.has(slug) || registry.skills.has(slug)) {
        return `${slug}${TAXONOMY_BOARD_SUFFIX}`;
    }
    return null;
}

/** Canonical URL slug for a resolved board (`-jobs` suffixed, except combos). */
export function boardCanonicalSlug(resolved: ResolvedTaxonomy): string {
    switch (resolved.kind) {
        case 'year':
        case 'combo':
            return resolved.slug;
        default:
            return `${resolved.slug}${TAXONOMY_BOARD_SUFFIX}`;
    }
}

/**
 * Build-time collision assertion: registry board URLs ∩ job-detail slugs = ∅.
 * The `/jobs/[slug]` route must never be ambiguous. Checks both the canonical
 * `-jobs` board URLs and the legacy unsuffixed slugs (legacy URLs 308, so a
 * job-detail slug must equal neither). Throws on conflict so the build fails
 * loudly (doc 22 §22.3 acceptance).
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
    for (const combo of registry.combos.values()) {
        registrySlugs.add(`${combo.roleSlug}-in-${combo.citySlug}`);
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
