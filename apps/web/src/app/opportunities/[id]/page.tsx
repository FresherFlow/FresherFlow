import { Opportunity } from '@fresherflow/types';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import OpportunityDetailClient from './OpportunityDetailClient';
import { OpportunityDetailSkeleton } from '@/components/ui/Skeleton';
import { getOpportunityPath } from '@/lib/opportunityPath';
import { parseOpportunityLocation } from '@/lib/opportunityDisplay';
import { getDriveDates, isCampusDriveOpportunity } from '@/shared/utils/driveTimeline';

interface ExtendedOpportunity extends Opportunity {
    updatedAt?: string | Date;
    normalizedRole?: string;
}

// ISR for public detail pages to absorb bot/preview traffic at CDN.
export const revalidate = 300;

type Props = {
    params: Promise<{ id: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
const EXPIRED_GRACE_DAYS = 45;

function getExpiryState(opportunity: ExtendedOpportunity) {
    if (!opportunity.expiresAt) return { isExpired: false, pastGrace: false };
    const expiresAt = new Date(opportunity.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return { isExpired: false, pastGrace: false };
    const now = Date.now();
    const isExpired = expiresAt.getTime() <= now;
    if (!isExpired) return { isExpired: false, pastGrace: false };
    const graceMs = EXPIRED_GRACE_DAYS * 24 * 60 * 60 * 1000;
    return { isExpired: true, pastGrace: now - expiresAt.getTime() > graceMs };
}

function getTypeHubPath(type?: Opportunity['type']) {
    if (type === 'JOB') return '/jobs';
    if (type === 'INTERNSHIP') return '/internships';
    if (type === 'WALKIN') return '/walk-ins';
    return '/opportunities';
}

async function fetchOpportunityForPage(slugOrId: string): Promise<ExtendedOpportunity | null> {
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

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: slugOrId } = await params;

    try {
        const opportunity = await fetchOpportunityForPage(slugOrId);
        if (!opportunity) throw new Error('Opportunity not found');
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

        const eligibility = opportunity.allowedPassoutYears.length > 0
            ? `${opportunity.allowedPassoutYears.join(', ')} graduates`
            : 'freshers';

        // LinkedIn requires 100+ char description
        const baseDesc = `Verified ${type.toLowerCase()} opportunity at ${company} in ${location}. Open to ${eligibility}.`;
        const applyInfo = opportunity.applyLink ? ' Direct application link available.' : '';
        const freshInfo = ' Browse verified job listings, internships, and walk-ins on FresherFlow.';
        const driveInfo = isCampusDrive
            ? ` Registration closes ${driveDates.regEnd ? driveDates.regEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'soon'}.`
            : '';
        const description = (baseDesc + applyInfo + driveInfo + freshInfo).substring(0, 200);

        // Canonical URL
        const canonicalId = opportunity.slug || opportunity.id;
        const canonicalPath = getOpportunityPath(opportunity.type, canonicalId);
        const url = `https://fresherflow.in${canonicalPath}`;

        // Dynamic OG image URL - use correct base for environment
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fresherflow.in';
        const ogImageVersion = process.env.NEXT_PUBLIC_OG_IMAGE_VERSION || '1';
        const ogUpdatedAt = opportunity.updatedAt || opportunity.postedAt || '';
        const dynamicOgImageUrl = `${baseUrl}/api/og/job/${encodeURIComponent(opportunity.id)}?v=${encodeURIComponent(ogImageVersion)}&t=${encodeURIComponent(String(ogUpdatedAt))}`;

        // Use dynamic OG image
        const ogImageUrl = dynamicOgImageUrl;

        return {
            title: seoTitle,
            description,
            robots: expiry.isExpired ? {
                index: false,
                follow: true,
            } : undefined,
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
    } catch {
        return {
            title: 'Opportunity Not Found | FresherFlow',
            description: 'This opportunity listing is no longer available.',
        };
    }
}

const generateJsonLd = (opportunity: Opportunity) => {
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
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: opportunity.title,
        description: opportunity.description,
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
                addressLocality: parsedLocation.city || parsedLocation.shortLabel,
                ...(parsedLocation.state ? { addressRegion: parsedLocation.state } : {}),
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

export default async function OpportunityDetailPage({ params }: Props) {
    const { id: slugOrId } = await params;
    let opportunityData = null;

    try {
        const opportunity = await fetchOpportunityForPage(slugOrId);
        opportunityData = opportunity;
        if (!opportunity) throw new Error('Opportunity not found');
        const expiry = getExpiryState(opportunity);

        // SEO Enforcement: Redirect to slug if ID was used
        if (slugOrId === opportunity.id && opportunity.slug) {
            redirect(getOpportunityPath(opportunity.type, opportunity.slug));
        }

        // Expired pages stay live for grace period, then redirect to the type hub.
        if (expiry.pastGrace) {
            redirect(getTypeHubPath(opportunity.type));
        }
    } catch {
        // Fallback handled by client component (loading/404)
    }

    return (
        <>
            {opportunityData && !getExpiryState(opportunityData).isExpired && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJsonLd(opportunityData)) }}
                />
            )}
            <Suspense fallback={<OpportunityDetailSkeleton />}>
                <OpportunityDetailClient id={slugOrId} initialData={opportunityData} />
            </Suspense>
        </>
    );
}
