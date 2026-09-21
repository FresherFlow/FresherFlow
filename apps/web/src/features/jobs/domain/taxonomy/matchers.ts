import type { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';
import { VALID_LOCATIONS } from '@/features/jobs/utils/locationUtils';
import { CURATED_ROLE_KEYWORDS } from './constants';
import type { ResolvedTaxonomy } from './constants';

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
