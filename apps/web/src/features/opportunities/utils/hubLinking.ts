import { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils/slugify';

export interface HubLink {
    label: string;
    url: string;
}

export interface HubCompany {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    slug: string;
}

export function extractHubRelations(opportunities: Opportunity[], exclude?: {
    skill?: string;
    city?: string;
    role?: string;
}) {
    // Only count truly active jobs: PUBLISHED status, not expired, not deleted
    const isActive = (opp: Opportunity) => {
        if (opp.status && opp.status !== 'PUBLISHED') return false;
        if (opp.expiresAt && new Date(opp.expiresAt) < new Date()) return false;
        return true;
    };

    // 1. Extract Top Companies
    const companyCounts: Record<string, { count: number; logoUrl: string | null | undefined; website: string | null | undefined; name: string }> = {};
    opportunities.forEach(opp => {
        if (!isActive(opp)) return;
        if (!opp.company) return;
        const slug = slugify(opp.company);
        if (!companyCounts[slug]) {
            companyCounts[slug] = { count: 0, logoUrl: opp.companyLogoUrl, website: opp.companyWebsite, name: opp.company };
        }
        companyCounts[slug].count++;
    });

    const topCompanies: HubCompany[] = Object.values(companyCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map(val => ({
            name: val.name,
            logoUrl: val.logoUrl,
            website: val.website,
            slug: slugify(val.name)
        }));

    // 2. Extract Related Skills
    const skillCounts: Record<string, { count: number, label: string }> = {};
    opportunities.forEach(opp => {
        if (!isActive(opp)) return;
        (opp.requiredSkills || []).forEach(skill => {
            const slug = slugify(skill);
            if (exclude?.skill && slug === slugify(exclude.skill)) return;
            
            if (!skillCounts[slug]) {
                skillCounts[slug] = { count: 0, label: skill };
            }
            skillCounts[slug].count++;
        });
    });

    const relatedSkills: HubLink[] = Object.values(skillCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(val => ({
            label: val.label,
            url: `/skills/${slugify(val.label)}`
        }));

    // 3. Extract Locations
    const BLOCKED_LOCS = new Set([
        'pan india', 'india', 'remote', 'work from home', 'wfh',
        'multiple locations', 'various locations', 'anywhere', 'worldwide',
        'across india', 'all india', 'multiple cities',
    ]);
    const isCleanLoc = (loc: string) => {
        const l = loc.toLowerCase().trim();
        if (BLOCKED_LOCS.has(l)) return false;
        if (l.includes(',') || l.includes('(')) return false;
        if (loc.length > 40 || loc.length < 2) return false;
        return true;
    };

    const locCounts: Record<string, { count: number, label: string }> = {};
    opportunities.forEach(opp => {
        if (!isActive(opp)) return;
        (opp.locations || []).forEach(loc => {
            if (!isCleanLoc(loc)) return;
            const slug = slugify(loc);
            if (exclude?.city && slug === slugify(exclude.city)) return;

            if (!locCounts[slug]) {
                locCounts[slug] = { count: 0, label: loc };
            }
            locCounts[slug].count++;
        });
    });

    const relatedLocations: HubLink[] = Object.values(locCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(val => ({
            label: val.label,
            url: `/location/${slugify(val.label)}`
        }));

    return {
        topCompanies,
        relatedSkills,
        relatedLocations
    };
}
