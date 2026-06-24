import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { cache } from 'react';
import { getOpportunityPath } from '@/features/opportunities/domain/opportunityPath';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';
import { getDriveDates, isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { SITE_URL } from '@/lib/utils/runtimeConfig';


export interface ExtendedOpportunity extends Opportunity {
    updatedAt?: string | Date;
    normalizedRole?: string;
}

type ParsedSalary = {
    minValue?: number;
    maxValue?: number;
    unitText: 'MONTH' | 'YEAR';
};

const EXPIRED_GRACE_DAYS = 45;

export function getExpiryState(opportunity: ExtendedOpportunity) {
    if (!opportunity.expiresAt) return { isExpired: false, pastGrace: false };
    const expiresAt = new Date(opportunity.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return { isExpired: false, pastGrace: false };
    const now = Date.now();
    const isExpired = expiresAt.getTime() <= now;
    if (!isExpired) return { isExpired: false, pastGrace: false };
    const graceMs = EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000;
    return { isExpired: true, pastGrace: now - expiresAt.getTime() > graceMs };
}

export function getTypeHubPath(type?: Opportunity['type']) {
    if (type === 'JOB') return '/jobs';
    if (type === 'INTERNSHIP') return '/internships';
    if (type === 'WALKIN') return '/walk-ins';
    return '/opportunities';
}

function parseNumericAmount(input: string): number | null {
    const normalized = input.trim().toLowerCase().replace(/,/g, '');
    const match = normalized.match(/(\d+(?:\.\d+)?)(\s*)(lpa|lac|lakh|lakhs|k|m|cr|crore|crores)?/i);
    if (!match) return null;

    const rawValue = Number(match[1]);
    if (!Number.isFinite(rawValue)) return null;

    const suffix = (match[3] || '').toLowerCase();
    if (suffix === 'lpa' || suffix === 'lac' || suffix === 'lakh' || suffix === 'lakhs') {
        return Math.round(rawValue * 100000);
    }
    if (suffix === 'k') {
        return Math.round(rawValue * 1000);
    }
    if (suffix === 'm') {
        return Math.round(rawValue * 1000000);
    }
    if (suffix === 'cr' || suffix === 'crore' || suffix === 'crores') {
        return Math.round(rawValue * 10000000);
    }

    return Math.round(rawValue);
}

function parseStructuredSalary(opportunity: Opportunity): ParsedSalary | null {
    const unitText: 'MONTH' | 'YEAR' = opportunity.salaryPeriod === 'MONTHLY' ? 'MONTH' : 'YEAR';
    const explicitMin = opportunity.salaryMin ?? opportunity.salary?.min ?? null;
    const explicitMax = opportunity.salaryMax ?? opportunity.salary?.max ?? null;

    if (explicitMin != null || explicitMax != null) {
        return {
            ...(explicitMin != null ? { minValue: explicitMin } : {}),
            ...(explicitMax != null ? { maxValue: explicitMax } : {}),
            unitText,
        };
    }

    const rawText = opportunity.salaryRange || opportunity.stipend || '';
    if (!rawText || /not disclosed|undisclosed|n\/a|na|tbd/i.test(rawText)) {
        return null;
    }

    const inferredUnit: 'MONTH' | 'YEAR' =
        /month|monthly|\/mo|\/month|per month|stipend/i.test(rawText)
            ? 'MONTH'
            : /year|yearly|annum|annual|lpa|ctc|pa\b|p\.a/i.test(rawText)
                ? 'YEAR'
                : unitText;

    const rangeMatch = rawText.match(/(\d+(?:\.\d+)?(?:\s*(?:lpa|lac|lakh|lakhs|k|m|cr|crore|crores))?)\s*(?:-|to)\s*(\d+(?:\.\d+)?(?:\s*(?:lpa|lac|lakh|lakhs|k|m|cr|crore|crores))?)/i);
    if (rangeMatch) {
        const minValue = parseNumericAmount(rangeMatch[1]);
        const maxValue = parseNumericAmount(rangeMatch[2]);
        if (minValue != null || maxValue != null) {
            return {
                ...(minValue != null ? { minValue } : {}),
                ...(maxValue != null ? { maxValue } : {}),
                unitText: inferredUnit,
            };
        }
    }

    const singleValue = parseNumericAmount(rawText);
    if (singleValue != null) {
        return { minValue: singleValue, maxValue: singleValue, unitText: inferredUnit };
    }

    return null;
}

// React cache() memoizes this per-request. generateMetadata and the page component
// both call this function — without cache(), both calls parse the entire bootstrap
// feed JSON separately. With cache(), the second call is free.
export const fetchOpportunityForPage = cache(async (slugOrId: string): Promise<ExtendedOpportunity | null> => {
    try {
        const { fetchBootstrapFeed, fetchExpiredFeed, fetchGovernmentFeed } = await import('@/lib/api/cdnFeed');

        // Fetch all three feeds in parallel — eliminates sequential 3× CDN latency on cold cache.
        // Each uses force-cache so on a warm CDN, all three complete near-simultaneously.
        // On a cold CDN (post-publish bust), parallel saves up to 2× the wait vs sequential.
        const [feed, govtFeed, expiredFeed] = await Promise.all([
            fetchBootstrapFeed(false),
            fetchGovernmentFeed(false),
            fetchExpiredFeed(),
        ]);

        // Check in priority order: active jobs → govt jobs → expired
        const opportunity =
            feed?.opportunities?.find(opp => opp.slug === slugOrId || opp.id === slugOrId) ??
            govtFeed?.opportunities?.find(opp => opp.slug === slugOrId || opp.id === slugOrId) ??
            expiredFeed?.opportunities?.find(opp => opp.slug === slugOrId || opp.id === slugOrId);

        return (opportunity as ExtendedOpportunity) ?? null;

        // --- SEQUENTIAL FALLBACK (restore if parallel causes issues) ---
        // const feed = await fetchBootstrapFeed(false);
        // if (feed?.opportunities) {
        //     const opportunity = feed.opportunities.find(opp => opp.slug === slugOrId || opp.id === slugOrId);
        //     if (opportunity) return opportunity as ExtendedOpportunity;
        // }
        // const govtFeed = await fetchGovernmentFeed(false);
        // if (govtFeed?.opportunities) {
        //     const govtOpportunity = govtFeed.opportunities.find(opp => opp.slug === slugOrId || opp.id === slugOrId);
        //     if (govtOpportunity) return govtOpportunity as ExtendedOpportunity;
        // }
        // const expiredFeed = await fetchExpiredFeed();
        // if (expiredFeed?.opportunities) {
        //     const expiredOpportunity = expiredFeed.opportunities.find(opp => opp.slug === slugOrId || opp.id === slugOrId);
        //     if (expiredOpportunity) return expiredOpportunity as ExtendedOpportunity;
        // }
        // return null;
    } catch {
        return null;
    }
});


export async function generateOpportunityMetadata(opportunity: ExtendedOpportunity): Promise<Metadata> {
    const expiry = getExpiryState(opportunity);

    const role = opportunity.normalizedRole || opportunity.title;
    const company = opportunity.company;
    const batch = opportunity.allowedPassoutYears?.length > 0 ? `${opportunity.allowedPassoutYears.join('/')} Batch` : '';
    const parsedLocation = parseOpportunityLocation(opportunity.locations);
    const location = parsedLocation.fullLabel;
    const isCampusDrive = isCampusDriveOpportunity(opportunity as Opportunity);
    const driveDates = getDriveDates(opportunity as Opportunity);
    const type = isCampusDrive
        ? 'Campus Drive'
        : opportunity.governmentJobDetails
            ? 'Government Job'
        : opportunity.type === 'INTERNSHIP'
            ? 'Internship'
            : opportunity.type === 'WALKIN'
                ? 'Walk-in'
                : 'Job';

    let seoTitle = `${role} at ${company} | ${type}`;
    if (batch) seoTitle += ` | ${batch}`;
    seoTitle += ` | ${location}`;
    seoTitle = seoTitle.length > 65 ? seoTitle.substring(0, 62) + '...' : seoTitle;

    const eligibility = opportunity.allowedPassoutYears.length > 0
        ? `${opportunity.allowedPassoutYears.join(', ')} graduates`
        : 'freshers';

    const baseDesc = `Verified ${type.toLowerCase()} opportunity at ${company} in ${location}. Open to ${eligibility}.`;
    const applyInfo = opportunity.applyLink ? ' Direct application link available.' : '';
    const freshInfo = ' Browse verified job listings, internships, and walk-ins on FresherFlow.';
    const driveInfo = isCampusDrive
        ? ` Registration closes ${driveDates.regEnd ? driveDates.regEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'soon'}.`
        : '';
    const rawDescription = baseDesc + applyInfo + driveInfo + freshInfo;
    const description = rawDescription.length > 160
        ? rawDescription.substring(0, 157).replace(/\s+\S*$/, '') + '...'
        : rawDescription;

    const canonicalId = opportunity.slug || opportunity.id;
    const canonicalPath = getOpportunityPath(opportunity.type, canonicalId);
    const url = `${SITE_URL}${canonicalPath}`;

    // Use the pre-generated static OG image from R2 (generated at publish time).
    // This avoids Vercel running opengraph-image.tsx on every bot crawl.
    // Falls back to the dynamic edge route for jobs not yet processed.
    const r2CdnBase = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';
    const staticOgUrl = `${r2CdnBase}/og/${opportunity.id}.png`;

    return {
        title: seoTitle,
        description,
        keywords: Array.from(new Set([
            opportunity.title,
            opportunity.company,
            type,
            ...(opportunity.tags || []),
            ...(opportunity.governmentJobDetails?.seoTags || []),
            opportunity.governmentJobDetails?.department || '',
            opportunity.governmentJobDetails?.organization || '',
        ].filter(Boolean))),
        robots: {
            index: !expiry.pastGrace,
            follow: true,
        },
        openGraph: {
            title: seoTitle,
            description,
            url,
            siteName: 'FresherFlow',
            type: 'website',
            images: [{ url: staticOgUrl, width: 1200, height: 630, alt: seoTitle }],
        },
        twitter: {
            card: 'summary_large_image',
            title: seoTitle,
            description,
            images: [staticOgUrl],
        },
        alternates: {
            canonical: url,
        },
    };
}

export const generateOpportunityJsonLd = (opportunity: Opportunity) => {
    const postedDate = opportunity.postedAt ? new Date(opportunity.postedAt) : null;
    const fallbackValidThrough = postedDate && !Number.isNaN(postedDate.getTime())
        ? new Date(postedDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
    let logoUrl = `${SITE_URL}/fresherflow-logo-v2.png`;
    try {
        const sourceUrl = opportunity.companyWebsite || opportunity.applyLink;
        if (sourceUrl) {
            const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
            const parts = hostname.split('.').filter(Boolean);
            const domain =
                parts.length > 2
                    ? parts.slice(-2).join('.')
                    : hostname;
            logoUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
        }
    } catch {
        // Fallback to default
    }

    const parsedLocation = parseOpportunityLocation(opportunity.locations);
    const primaryLocality = (parsedLocation.city || parsedLocation.shortLabel || 'India')
        .replace(/\s\+\d+$/, '')
        .trim();
    const rawLocationText = Array.isArray(opportunity.locations) ? opportunity.locations.join(', ') : '';
    const postalCodeMatch = rawLocationText.match(/\b\d{6}\b/);
    const salary = parseStructuredSalary(opportunity);
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: opportunity.title,
        description: opportunity.description?.replace(/<[^>]+>/g, ''),
        identifier: {
            '@type': 'PropertyValue',
            name: opportunity.company,
            value: opportunity.id
        },
        datePosted: opportunity.postedAt,
        validThrough: opportunity.expiresAt || fallbackValidThrough,
        hiringOrganization: {
            '@type': 'Organization',
            name: opportunity.company,
            logo: logoUrl,
            ...(opportunity.companyWebsite ? { sameAs: opportunity.companyWebsite } : {})
        },
        jobLocation: {
            '@type': 'Place',
            address: {
                '@type': 'PostalAddress',
                streetAddress: primaryLocality,
                addressLocality: primaryLocality,
                addressRegion: parsedLocation.state || primaryLocality,
                ...(postalCodeMatch ? { postalCode: postalCodeMatch[0] } : {}),
                addressCountry: 'IN'
            }
        },
        employmentType: opportunity.type === 'INTERNSHIP' ? 'INTERN' : 'FULL_TIME',
        directApply: true,
        skills: opportunity.requiredSkills?.join(', '),
    };

    const locationLabel = parsedLocation.fullLabel.toLowerCase();
    const isRemoteRole =
        opportunity.workMode === 'REMOTE' ||
        locationLabel.includes('remote') ||
        locationLabel.includes('pan india');

    if (isRemoteRole) {
        schema.jobLocationType = 'TELECOMMUTE';
        schema.applicantLocationRequirements = {
            '@type': 'Country',
            name: 'India',
        };
    }

    if (salary && (salary.minValue != null || salary.maxValue != null)) {
        schema.baseSalary = {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: {
                '@type': 'QuantitativeValue',
                ...(salary.minValue != null ? { minValue: salary.minValue } : {}),
                ...(salary.maxValue != null ? { maxValue: salary.maxValue } : {}),
                unitText: salary.unitText
            }
        };
    }

    if (opportunity.governmentJobDetails) {
        const govt = opportunity.governmentJobDetails;
        schema.occupationalCategory = govt.department || 'Government Jobs';
        schema.qualifications = [
            govt.ageMin != null || govt.ageMax != null
                ? `Age limit: ${govt.ageMin ?? '?'} - ${govt.ageMax ?? '?'}`
                : '',
            govt.ageRelaxation || '',
            govt.applicationFee ? `Application fee: ${govt.applicationFee}` : '',
            ...(govt.selectionStages || []),
        ].filter(Boolean).join(' | ');
    }

    return schema;
};

export const generateOpportunityBreadcrumbsJsonLd = (opportunity: Opportunity) => {
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const typeLabel = opportunity.type === 'INTERNSHIP' ? 'Internships' : opportunity.type === 'WALKIN' ? 'Walk-ins' : 'Jobs';
    const typePath = opportunity.type === 'INTERNSHIP' ? '/internships' : opportunity.type === 'WALKIN' ? '/walk-ins' : '/jobs';
    
    // Dynamic import to avoid build-time issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { slugify } = require('@fresherflow/utils');
    const companySlug = slugify(opportunity.company || '');
    
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${base}`
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: typeLabel,
                item: `${base}${typePath}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: opportunity.company,
                item: `${base}/companies/${companySlug}`
            },
            {
                '@type': 'ListItem',
                position: 4,
                name: opportunity.title,
                item: `${base}${getOpportunityPath(opportunity.type, opportunity.slug || opportunity.id)}`
            }
        ]
    };
};
