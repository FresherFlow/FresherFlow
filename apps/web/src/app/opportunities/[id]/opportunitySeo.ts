import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { getOpportunityPath } from '@/lib/opportunityPath';
import { parseOpportunityLocation } from '@/lib/opportunityDisplay';
import { getDriveDates, isCampusDriveOpportunity } from '@/shared/utils/driveTimeline';

export interface ExtendedOpportunity extends Opportunity {
    updatedAt?: string | Date;
    normalizedRole?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
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

export async function fetchOpportunityForPage(slugOrId: string): Promise<ExtendedOpportunity | null> {
    try {
        const response = await fetch(`${API_BASE}/api/opportunities/${encodeURIComponent(slugOrId)}`, {
            method: 'GET',
            headers: {
                'X-Requested-From': 'fresherflow-web',
            },
            next: { revalidate: 300 },
        });

        if (!response.ok) return null;
        const payload = await response.json() as { opportunity?: ExtendedOpportunity };
        return payload.opportunity || null;
    } catch {
        return null;
    }
}

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
    const url = `https://fresherflow.in${canonicalPath}`;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fresherflow.in';
    const ogImageVersion = process.env.NEXT_PUBLIC_OG_IMAGE_VERSION || '1';
    const ogUpdatedAt = opportunity.updatedAt || opportunity.postedAt || '';
    const ogImageUrl = `${baseUrl}/api/og/job/${encodeURIComponent(opportunity.id)}?v=${encodeURIComponent(ogImageVersion)}&t=${encodeURIComponent(String(ogUpdatedAt))}`;

    return {
        title: seoTitle,
        description,
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
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: `${opportunity.title} at ${opportunity.company}`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: seoTitle,
            description,
            images: [ogImageUrl],
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
    let logoUrl = 'https://fresherflow.in/fresherflow-logo-v2.png';
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
            logo: logoUrl
        },
        jobLocation: {
            '@type': 'Place',
            address: {
                '@type': 'PostalAddress',
                streetAddress: primaryLocality,
                addressLocality: primaryLocality,
                ...(parsedLocation.state ? { addressRegion: parsedLocation.state } : {}),
                ...(postalCodeMatch ? { postalCode: postalCodeMatch[0] } : {}),
                addressCountry: 'IN'
            }
        },
        employmentType: opportunity.type === 'INTERNSHIP' ? 'INTERN' : 'FULL_TIME',
        directApply: true,
    };

    const locationLabel = parsedLocation.fullLabel.toLowerCase();
    const isRemoteRole =
        opportunity.workMode === 'REMOTE' ||
        locationLabel.includes('remote') ||
        locationLabel.includes('pan india');

    if (isRemoteRole) {
        schema.jobLocationType = 'TELECOMMUTE';
    }

    const schemaSalaryMin = opportunity.salaryMin ?? opportunity.salary?.min ?? null;
    const schemaSalaryMax = opportunity.salaryMax ?? opportunity.salary?.max ?? null;
    if (schemaSalaryMin != null || schemaSalaryMax != null) {
        schema.baseSalary = {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: {
                '@type': 'QuantitativeValue',
                ...(schemaSalaryMin != null ? { minValue: schemaSalaryMin } : {}),
                ...(schemaSalaryMax != null ? { maxValue: schemaSalaryMax } : {}),
                unitText: opportunity.salaryPeriod === 'MONTHLY' ? 'MONTH' : 'YEAR'
            }
        };
    }

    return schema;
};
