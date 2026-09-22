import type { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS, getCanonicalLocation } from '@/features/jobs/utils/locationUtils';
import {
    TAXONOMY_MIN_JOBS,
    CURATED_ROLE_KEYWORDS,
    isCleanLocation,
    formatSkillLabel,
    titleCaseSlug,
    ROLE_TAG_NOISE,
    skipTagSlug,
} from './constants';
import type { TaxonomyRegistry, TaxonomyItem, TaxonomyCombo } from './constants';

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

        // ── Role–city combos (inventory-gated, never a matrix) ───────────────
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

    // Curated roles: only if >0 like backend sitemap validRoles >0, others >=5
    const roles = new Map<string, TaxonomyItem>();
    for (const slug of Object.keys(CURATED_ROLE_KEYWORDS) as (keyof typeof CURATED_ROLE_KEYWORDS)[]) {
        const count = roleCounts.get(slug) ?? 0;
        if (count > 0) {
            roles.set(slug, { slug, label: CURATED_ROLE_KEYWORDS[slug].label, count });
        }
    }
    for (const [slug, count] of roleCounts) {
        if (roles.has(slug)) continue;
        if (count >= 5) {
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
        if (count >= 5) {
            skills.set(slug, { slug, label: formatSkillLabel(slug), count });
        }
    }

    const years = new Map<number, number>();
    for (const [year, count] of yearCounts) {
        if (year < 2015 || year > 2035) continue;
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


