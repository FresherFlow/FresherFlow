import { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';

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
    const isExpired = (opp: Opportunity) => opp.expiresAt && new Date(opp.expiresAt) < new Date();

    // 1. Extract Top Companies
    const companyCounts: Record<string, { count: number; logoUrl: string | null | undefined; website: string | null | undefined; name: string }> = {};
    opportunities.forEach(opp => {
        if (isExpired(opp)) return;
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
        if (isExpired(opp)) return;
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
    const locCounts: Record<string, { count: number, label: string }> = {};
    opportunities.forEach(opp => {
        if (isExpired(opp)) return;
        (opp.locations || []).forEach(loc => {
            const slug = slugify(loc);
            if (exclude?.city && slug === slugify(exclude.city)) return;
            // Clean location string (e.g. filter out 'India' or general terms if possible)
            if (loc.toLowerCase() === 'india' || loc.toLowerCase() === 'pan india') return;
            
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
