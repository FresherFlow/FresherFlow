import { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS, getCanonicalLocation } from '../utils/locationUtils';

/**
 * Taxonomy registry v2 (doc 22 §22.3) — build-time registry of board slugs
 * derived from a single feed pass. Consumed by `/jobs/[slug]` (resolver),
 * `/jobs/browse` (directory) and the TopicBoard pages.
 *
 * Inventory-gated: roles, cities and skills need >= TAXONOMY_MIN_JOBS live
 * matches; role×city combos need >= TAXONOMY_MIN_JOBS paired matches —
 * never an unbounded matrix.
 */

export const TAXONOMY_MIN_JOBS = 3;

export interface TaxonomyItem {
    slug: string;
    label: string;
    count: number;
}

export interface TaxonomyCombo {
    roleSlug: string;
    citySlug: string;
    roleLabel: string;
    cityLabel: string;
    count: number;
}

export interface TaxonomyRegistry {
    roles: Map<string, TaxonomyItem>;
    cities: Map<string, TaxonomyItem>;
    skills: Map<string, TaxonomyItem>;
    years: Map<number, number>;
    combos: Map<string, TaxonomyCombo>;
}

/** Curated role seeds — hand-picked, always valid (from legacy /roles). */
export const CURATED_ROLE_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
    'software-engineer': {
        label: 'Software Engineer',
        keywords: ['software engineer', 'software developer', 'sde', 'full stack', 'backend developer', 'frontend developer', 'programmer', 'developer'],
    },
    'data-analyst': {
        label: 'Data Analyst',
        keywords: ['data analyst', 'bi analyst', 'data analytics', 'data scientist', 'ml engineer'],
    },
    'business-analyst': {
        label: 'Business Analyst',
        keywords: ['business analyst', 'product analyst', 'consultant', 'ba '],
    },
    'frontend-developer': {
        label: 'Frontend Developer',
        keywords: ['frontend developer', 'frontend engineer', 'ui developer', 'web developer'],
    },
    'test-engineer': {
        label: 'Test Engineer',
        keywords: ['test engineer', 'qa', 'quality assurance', 'sdet', 'automation engineer', 'tester'],
    },
};

export const DEFAULT_BATCH_YEARS = [2024, 2025, 2026, 2027, 2028];

const BLOCKED_LOCATIONS = new Set([
    'pan india', 'india', 'remote', 'work from home', 'wfh',
    'multiple locations', 'various locations', 'anywhere', 'worldwide',
    'across india', 'all india', 'multiple cities',
]);

const isCleanLocation = (loc: string) => {
    const l = loc.toLowerCase().trim();
    if (BLOCKED_LOCATIONS.has(l)) return false;
    if (l.includes(',')) return false;
    if (l.includes('(')) return false;
    if (loc.length > 40) return false;
    if (loc.length < 2) return false;
    return true;
};

/** Skill label formatting shared by board pages, metadata and the directory. */
export function formatSkillLabel(slug: string): string {
    const mappings: Record<string, string> = {
        'java': 'Java',
        'python': 'Python',
        'react': 'React',
        'javascript': 'JavaScript',
        'sql': 'SQL',
        'aws': 'AWS',
        'testing': 'Testing',
        'node-js': 'Node.js',
        'c-plus-plus': 'C++',
        'data-structures': 'DSA',
        'html-css': 'HTML/CSS'
    };
    return mappings[slug.toLowerCase()] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function titleCaseSlug(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function yearBoardSlug(year: number): string {
    return `${year}-batch`;
}

/** Public URL for a registry board slug. */
export function boardPath(slug: string): string {
    return `/jobs/${slug}`;
}


/** Guard: skip tag-derived role slugs that are noise, not roles. */
const ROLE_TAG_NOISE = new Set(['walkin', 'walk-in', 'drive', 'off-campus', 'internship', 'government', 'govt', 'fresher', 'freshers', 'job', 'jobs', 'hiring']);

function skipTagSlug(tagSlug: string, titleLower: string): boolean {
    if (!tagSlug || CURATED_ROLE_KEYWORDS[tagSlug] || ROLE_TAG_NOISE.has(tagSlug)) return true;
    return !titleLower.includes(tagSlug.replace(/-/g, ' '));
}

export function buildTaxonomyRegistry(opportunities: Opportunity[]): TaxonomyRegistry {
    const roleCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const skillCounts = new Map<string, number>();
    const yearCounts = new Map<number, number>();
    const comboCounts = new Map<string, number>();

    const bump = (map: Map<string, number>, key: string) =>
        map.set(key, (map.get(key) ?? 0) + 1);

    for (const opp of opportunities) {
        const matchedRoles = new Set<string>();
        const matchedCities = new Set<string>();

        // ── Roles: curated keywords + jobFunction + tags ────────────────────
        const titleLower = (opp.title || '').toLowerCase();
        const jfSlug = opp.jobFunction ? slugify(opp.jobFunction) : null;

        for (const [roleSlug, roleInfo] of Object.entries(CURATED_ROLE_KEYWORDS)) {
            if (jfSlug === roleSlug) {
                matchedRoles.add(roleSlug);
                continue;
            }
            if (roleInfo.keywords.some(kw => titleLower.includes(kw))) {
                matchedRoles.add(roleSlug);
            }
        }
        if (jfSlug && !CURATED_ROLE_KEYWORDS[jfSlug]) {
            bump(roleCounts, jfSlug);
        }
        for (const tag of opp.tags || []) {
            const tagSlug = slugify(tag);
            if (skipTagSlug(tagSlug, titleLower)) continue;
            matchedRoles.add(tagSlug);
        }
        for (const roleSlug of matchedRoles) bump(roleCounts, roleSlug);

        // ── Cities: locations list + REMOTE workMode ────────────────────────
        if (opp.workMode === 'REMOTE') {
            matchedCities.add('remote');
        }
        for (const location of opp.locations || []) {
            if (!location) continue;
            const key = location.trim();
            if (!isCleanLocation(key)) continue;
            const canonical = getCanonicalLocation(slugify(key)) || slugify(key);
            matchedCities.add(canonical);
        }
        for (const citySlug of matchedCities) bump(cityCounts, citySlug);

        // ── Skills ───────────────────────────────────────────────────────────
        for (const skill of opp.requiredSkills || []) {
            const skillSlug = slugify(skill);
            if (skillSlug) bump(skillCounts, skillSlug);
        }

        // ── Years ────────────────────────────────────────────────────────────
        for (const year of opp.allowedPassoutYears || []) {
            if (typeof year === 'number' && !Number.isNaN(year)) {
                yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
            }
        }

        // ── Role×city combos (inventory-gated, never a matrix) ───────────────
        for (const roleSlug of matchedRoles) {
            for (const citySlug of matchedCities) {
                if (citySlug === 'remote') continue;
                const key = `${roleSlug}|${citySlug}`;
                comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
            }
        }
    }

    const cityLabel = (slug: string) =>
        VALID_LOCATIONS[slug as keyof typeof VALID_LOCATIONS]?.label || titleCaseSlug(slug);

    // Curated roles are always present; feed-derived roles are gated.
    const roles = new Map<string, TaxonomyItem>();
    for (const slug of Object.keys(CURATED_ROLE_KEYWORDS) as (keyof typeof CURATED_ROLE_KEYWORDS)[]) {
        roles.set(slug, { slug, label: CURATED_ROLE_KEYWORDS[slug].label, count: roleCounts.get(slug) ?? 0 });
    }
    for (const [slug, count] of roleCounts) {
        if (roles.has(slug)) continue;
        if (count >= TAXONOMY_MIN_JOBS) {
            roles.set(slug, { slug, label: titleCaseSlug(slug), count });
        }
    }

    const cities = new Map<string, TaxonomyItem>();
    for (const [slug, count] of cityCounts) {
        if (count >= TAXONOMY_MIN_JOBS) {
            cities.set(slug, { slug, label: cityLabel(slug), count });
        }
    }

    const skills = new Map<string, TaxonomyItem>();
    for (const [slug, count] of skillCounts) {
        if (count >= TAXONOMY_MIN_JOBS) {
            skills.set(slug, { slug, label: formatSkillLabel(slug), count });
        }
    }

    const years = new Map<number, number>();
    for (const [year, count] of yearCounts) {
        if (count >= TAXONOMY_MIN_JOBS) years.set(year, count);
    }

    const combos = new Map<string, TaxonomyCombo>();
    for (const [key, count] of comboCounts) {
        if (count < TAXONOMY_MIN_JOBS) continue;
        const [roleSlug, citySlug] = key.split('|');
        const role = roles.get(roleSlug);
        const city = cities.get(citySlug);
        if (!role || !city) continue;
        combos.set(key, {
            roleSlug,
            citySlug,
            roleLabel: role.label,
            cityLabel: city.label,
            count,
        });
    }

    return { roles, cities, skills, years, combos };
}


export type ResolvedTaxonomy =
    | { kind: 'role'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'city'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'skill'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'year'; slug: string; label: string; year: number }
    | { kind: 'combo'; slug: string; label: string; combo: TaxonomyCombo };

/** Canonicalize an incoming URL param into a registry slug (or empty string). */
export function normalizeTaxonomySlug(raw: string): string {
    return slugify(decodeURIComponent(raw));
}

/** Combos parse before plain roles: `/jobs/software-engineer-in-bangalore`. */
export function resolveTaxonomySlug(registry: TaxonomyRegistry, rawSlug: string): ResolvedTaxonomy | null {
    const slug = normalizeTaxonomySlug(rawSlug);
    if (!slug) return null;

    // Year batch boards: `/jobs/2026-batch`
    const yearMatch = /^(\d{4})-batch$/.exec(slug);
    if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        if (registry.years.has(year)) {
            return { kind: 'year', slug, label: `${year} Batch`, year };
        }
        return null;
    }

    // Combined role×city boards: `/jobs/software-engineer-in-bangalore`
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

    const role = registry.roles.get(slug);
    if (role) return { kind: 'role', slug, label: role.label, item: role };

    const city = registry.cities.get(slug);
    if (city) return { kind: 'city', slug, label: city.label, item: city };

    const skill = registry.skills.get(slug);
    if (skill) return { kind: 'skill', slug, label: skill.label, item: skill };

    return null;
}

/**
 * Build-time collision assertion: registry slugs ∩ job-detail slugs = ∅.
 * The `/jobs/[slug]` route must never be ambiguous. Throws on conflict so the
 * build fails loudly (doc 22 §22.3 acceptance).
 */
export function assertRegistryJobSlugCollision(
    registry: TaxonomyRegistry,
    jobSlugs: Set<string>,
): void {
    const registrySlugs = new Set<string>();
    for (const slug of registry.roles.keys()) registrySlugs.add(slug);
    for (const slug of registry.cities.keys()) registrySlugs.add(slug);
    for (const slug of registry.skills.keys()) registrySlugs.add(slug);
    for (const year of registry.years.keys()) registrySlugs.add(yearBoardSlug(year));
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


// ── Matchers (moved out of the legacy /roles, /skills, /locations, /batch route files) ──

export function matchRole(opp: Opportunity, roleSlug: string): boolean {
    const roleInfo = CURATED_ROLE_KEYWORDS[roleSlug];
    const keywords = roleInfo?.keywords ?? [roleSlug.replace(/-/g, ' ')];
    const titleLower = (opp.title || '').toLowerCase();
    const jfSlug = opp.jobFunction ? slugify(opp.jobFunction) : null;

    if (opp.tags?.some(t => slugify(t) === roleSlug)) return true;
    if (jfSlug === roleSlug) return true;
    if (jfSlug === 'engineering' && roleSlug === 'software-engineer') return true;
    return keywords.some(kw => new RegExp(`\\b${kw.trim()}\\b`, 'i').test(titleLower));
}

export function matchSkill(opp: Opportunity, skillSlug: string): boolean {
    if (!opp.requiredSkills || !Array.isArray(opp.requiredSkills)) return false;
    return opp.requiredSkills.some(skill => {
        const lowerSkill = skill.toLowerCase();
        return lowerSkill === skillSlug || lowerSkill.replace(/[^a-z0-9]+/g, '-') === skillSlug;
    });
}

export function matchCity(opp: Opportunity, citySlug: string): boolean {
    if (citySlug === 'remote') {
        if (opp.workMode === 'REMOTE') return true;
        const locLabel = (opp.locations || []).join(' ').toLowerCase();
        return locLabel.includes('remote') || locLabel.includes('work from home') || locLabel.includes('wfh') || locLabel.includes('pan india');
    }
    const aliases = VALID_LOCATIONS[citySlug as keyof typeof VALID_LOCATIONS]?.aliases ?? [citySlug.replace(/-/g, ' '), citySlug];
    return (opp.locations || []).some(l => {
        const lower = l.toLowerCase();
        return aliases.some(alias => lower.includes(alias));
    });
}

export function matchYear(opp: Opportunity, year: number): boolean {
    return Boolean(opp.allowedPassoutYears && Array.isArray(opp.allowedPassoutYears) && opp.allowedPassoutYears.includes(year));
}

export function matchTaxonomy(opp: Opportunity, resolved: ResolvedTaxonomy): boolean {
    switch (resolved.kind) {
        case 'role': return matchRole(opp, resolved.slug);
        case 'city': return matchCity(opp, resolved.slug);
        case 'skill': return matchSkill(opp, resolved.slug);
        case 'year': return matchYear(opp, resolved.year);
        case 'combo': return matchRole(opp, resolved.combo.roleSlug) && matchCity(opp, resolved.combo.citySlug);
    }
}

/** Initial listing filters for a resolved board (drives the CategoryPage engine). */
export function boardFilters(resolved: ResolvedTaxonomy): Partial<Record<string, unknown>> {
    switch (resolved.kind) {
        case 'city':
            // `/jobs/remote` is a work-mode board, not a location chip — avoids a
            // duplicate "Remote" chip when combined with `?mode=remote` (same filter).
            if (resolved.slug === 'remote') return { workMode: ['REMOTE'] };
            return { location: resolved.label };
        case 'year': return { year: resolved.year };
        case 'skill': return { skills: [resolved.label] };
        case 'combo': return { role: [resolved.combo.roleLabel], location: resolved.combo.cityLabel };
        default: return {};
    }
}

