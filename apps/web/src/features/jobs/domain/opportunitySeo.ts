import { Opportunity } from '@fresherflow/types';
import type { CategoryFeedType } from '@/features/jobs/utils/walkinMapUtils';
import { isGovernmentOpportunity, isInternshipOpportunity, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';
import { Metadata } from 'next';
import { cache } from 'react';
import { getOpportunityPath } from '@/features/jobs/domain/opportunityPath';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { getDriveDates, isCampusDriveOpportunity } from '@/features/jobs/domain/driveTimeline';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { fetchBootstrapFeed, fetchExpiredFeed, fetchFeedIndex, fetchGovernmentFeed, fetchOpportunityDetail } from '@/lib/api/feedServer';
import { slugify } from '@fresherflow/utils/slugify';
import { truncateTitleByPixels, truncateDescription } from '@/lib/seo/seoMetrics';

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

export function getTypeHubPath(type?: CategoryFeedType | string | null) {
    if (type === 'JOB') return '/jobs';
    if (type === 'INTERNSHIP') return '/jobs/internships';
    if (type === 'WALKIN') return '/drives/walk-in';
    return '/jobs';
}

/**
 * The detail namespace an opportunity belongs to. Government and walk-in
 * events have their own namespaces; jobs and internships share `/jobs`.
 */
export function getDetailType(opportunity: Opportunity): 'GOVERNMENT' | 'WALKIN' | undefined {
    if (isGovernmentOpportunity(opportunity)) return 'GOVERNMENT';
    if (isWalkinOpportunity(opportunity)) return 'WALKIN';
    return undefined;
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
        // 1. Try direct individual static JSON on CDN edge first (ultra-fast, ~2.5KB payload)
        const directJob = await fetchOpportunityDetail(slugOrId);
        if (directJob) {
            return directJob as ExtendedOpportunity;
        }

        // 2. Fallback when the individual JSON is missing or cold.
        //
        //    fetchOpportunityDetail already fetched the feed index internally
        //    (feedServer.ts resolves slug -> id from the index), and fetchFeedIndex
        //    is cache()-wrapped, so this call is free. The index decides whether
        //    this is a real listing at all — a slug not in the active index,
        //    the government feed, or the expired feed is a 404, and a 404 must
        //    not download the 1.9 MB bootstrap feed.
        const index = await fetchFeedIndex();
        const inActiveFeed = (index?.opportunities ?? []).some(
            (opp) => opp.id === slugOrId || opp.slug === slugOrId,
        );

        if (!inActiveFeed) {
            // Not in the active feed — only check government and expired feeds.
            // Fetching both in parallel is cheap; neither is the 1.9 MB bootstrap.
            const [govtFeed, expiredFeed] = await Promise.all([
                fetchGovernmentFeed(),
                fetchExpiredFeed(),
            ]);

            const oppMap = new Map<string, Opportunity>();

            // Populate in reverse priority so higher priority overwrites:
            // Priority: govtFeed > expiredFeed
            expiredFeed?.opportunities?.forEach(opp => {
                if (opp.id) oppMap.set(opp.id, opp);
                if (opp.slug) oppMap.set(opp.slug, opp);
            });

            govtFeed?.opportunities?.forEach(opp => {
                if (opp.id) oppMap.set(opp.id, opp);
                if (opp.slug) oppMap.set(opp.slug, opp);
            });

            return (oppMap.get(slugOrId) as ExtendedOpportunity) ?? null;
        }

        // In the active feed but the individual shard missed — fetch the full
        // bootstrap feed for the payload (description, apply link, etc.).
        // The active feed has highest priority, so government/expired data is
        // not needed here.
        const feed = await fetchBootstrapFeed();
        if (feed?.opportunities) {
            const opportunity = feed.opportunities.find(
                (opp) => opp.id === slugOrId || opp.slug === slugOrId,
            );
            if (opportunity) return opportunity as ExtendedOpportunity;
        }
        return null;

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

// Metadata-only resolver: shard-only (single ~2.5KB detail JSON via
// fetchOpportunityDetail). Deliberately skips the taxonomy registry build and
// the bootstrap/government/expired fallback feeds — those stay on the
// page-component path, which shares them per-request through React.cache.
// Keeps generateMetadata cheap and cacheable on this high-cardinality route.
export const fetchOpportunityForMetadata = cache(async (slugOrId: string): Promise<ExtendedOpportunity | null> => {
    try {
        const directJob = await fetchOpportunityDetail(slugOrId);
        return (directJob as ExtendedOpportunity) ?? null;
    } catch {
        return null;
    }
});


/** A closed listing keeps its title for context but must not be indexed as an open job. */
export function generateClosedOpportunityMetadata(opportunity: ExtendedOpportunity): Metadata {
    const title = `${opportunity.title} — listing unavailable | FresherFlow`;
    return {
        title: { absolute: truncateTitleByPixels(title) },
        description: 'This listing is no longer available. FresherFlow keeps it for reference and links to current fresher jobs.',
        robots: { index: false, follow: true },
    };
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
    // Classification precedence follows the user's intent: a walk-in is an
    // event first, even when the underlying opportunity is an internship.
    // Show both in the title instead of hiding the recruitment method.
    const isWalkinSeo = isWalkinOpportunity(opportunity);
    const isInternSeo = isInternshipOpportunity(opportunity);
    const type = isCampusDrive
        ? 'Campus Drive'
        : isGovernmentOpportunity(opportunity)
            ? 'Government Job'
            : isWalkinSeo && isInternSeo
                ? 'Walk-in Internship'
                : isWalkinSeo
                    ? 'Walk-in Drive'
                    : isInternSeo
                        ? 'Internship'
                        : 'Job';

    // Root layout applies the `| FresherFlow` template (14 chars). Keep the
    // page-level title at 46 chars or less so the rendered <title> stays
    // inside the 60-char SERP limit. Segments are added by priority and only
    // when they fit; a long role is cut on a word boundary, never mid-word.
    const TITLE_BUDGET = 60 - ' | FresherFlow'.length;
    const fitTitle = (text: string) => {
        if (text.length <= TITLE_BUDGET) return text;
        const cut = text.slice(0, TITLE_BUDGET - 3);
        const lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > TITLE_BUDGET / 2 ? cut.slice(0, lastSpace) : cut).trimEnd() + '...';
    };

    // Short label for the title: "Walk-in" carries the recruitment intent
    // without spending 18 chars on "Walk-in Internship". The hero still shows
    // both labels.
    const titleType = isCampusDrive
        ? 'Drive'
        : isGovernmentOpportunity(opportunity)
            ? 'Govt Job'
            : isWalkinSeo
                ? 'Walk-in'
                : isInternSeo
                    ? 'Internship'
                    : 'Job';

    let rawTitle = fitTitle(`${role} at ${company}`);
    const withType = `${rawTitle} | ${titleType}`;
    if (withType.length <= TITLE_BUDGET) rawTitle = withType;
    if (batch) {
        const withBatch = `${rawTitle} | ${batch}`;
        if (withBatch.length <= TITLE_BUDGET) rawTitle = withBatch;
    }
    // Location is the least important segment: append it only when it fits.
    if (location) {
        const withLocation = `${rawTitle} | ${location}`;
        if (withLocation.length <= TITLE_BUDGET) rawTitle = withLocation;
    }
    const seoTitle = truncateTitleByPixels(rawTitle);

    const passoutYears = opportunity.allowedPassoutYears ?? [];
    const eligibility = passoutYears.length > 0
        ? `${passoutYears.join(', ')} graduates`
        : 'freshers';

    const baseDesc = `Current and active ${type.toLowerCase()} opening at ${company} in ${location}. Open to ${eligibility}.`;
    const applyInfo = opportunity.applyLink ? ' Direct application link available.' : '';
    const freshInfo = ' Browse current job openings, internships, and walk-ins shared on FresherFlow.';
    const driveInfo = isCampusDrive
        ? ` Registration closes ${driveDates.regEnd ? driveDates.regEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'soon'}.`
        : '';
    const rawDescription = baseDesc + applyInfo + driveInfo + freshInfo;
    const description = truncateDescription(rawDescription);

    const canonicalId = opportunity.slug || opportunity.id;
    const canonicalPath = getOpportunityPath(getDetailType(opportunity), canonicalId);
    const url = `${SITE_URL}${canonicalPath}`;

    // Use the pre-generated static OG image from R2 (generated at publish time).
    // This avoids Vercel running opengraph-image.tsx on every bot crawl.
    // Falls back to the dynamic edge route for jobs not yet processed.
    const staticOgUrl = `${CDN_URL}/og/${opportunity.id}.png`;

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

/** Real UGC input for the discussion node. Empty/null = no discussion node emitted. */
export interface DiscussionJsonLdInput {
    comments: { author: string; text: string; createdAt: string }[];
    /** Only question→answer pairs; empty means no FAQPage node is emitted. */
    faqs?: { question: string; answer: string }[];
    total: number;
}

export const generateOpportunityJsonLd = (
    opportunity: Opportunity,
    discussion?: DiscussionJsonLdInput | null
) => {
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
        description: opportunity.description ? (() => {
            let desc = opportunity.description;
            let lastDesc;
            do {
                lastDesc = desc;
                desc = desc.replace(/<[^>]+>/g, '');
            } while (desc !== lastDesc);
            return desc;
        })() : undefined,
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
        employmentType: isInternshipOpportunity(opportunity) ? 'INTERN' : 'FULL_TIME',
        directApply: true,
        skills: opportunity.requiredSkills?.join(', '),
        experienceRequirements: {
            '@type': 'OccupationalExperienceRequirements',
            monthsOfExperience: 0,
        },
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

    const base = SITE_URL.replace(/\/+$/, '');
    const breadcrumbs = buildCompanyBreadcrumbs(opportunity, base);
    const graph: Record<string, unknown>[] = [breadcrumbs, schema];

    // A job's discussion is real UGC, so it earns a truthfully-labeled
    // DiscussionForumPosting node — never a synthesized FAQPage. A flat thread
    // has answers with no questions, and inventing pairs for FAQPage is the
    // kind of fabricated structured data Google penalises.
    if (discussion && discussion.comments.length > 0) {
        graph.push(buildDiscussionPosting(opportunity, discussion, base));
    }

    // FAQPage is emitted only when a question carries an explicit answer, and
    // only because the job page renders that same Q&A visibly. Google requires
    // the content to be on the page, not schema-only.
    if (discussion?.faqs && discussion.faqs.length > 0) {
        graph.push({
            '@type': 'FAQPage',
            mainEntity: discussion.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: faq.answer,
                },
            })),
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    };
};

function buildDiscussionPosting(
    opportunity: Opportunity,
    discussion: DiscussionJsonLdInput,
    base: string
) {
    const [first] = discussion.comments;
    const path = getOpportunityPath(
        getDetailType(opportunity),
        opportunity.slug || opportunity.id
    );

    return {
        '@type': 'DiscussionForumPosting',
        headline: `${opportunity.title} discussion`,
        text: `Freshers discussing ${opportunity.title} at ${opportunity.company}.`,
        url: `${base}${path}#discussion`,
        datePublished: first.createdAt,
        author: { '@type': 'Person', name: first.author },
        interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: discussion.total,
        },
        comment: discussion.comments.map((comment) => ({
            '@type': 'Comment',
            text: comment.text,
            datePublished: comment.createdAt,
            author: { '@type': 'Person', name: comment.author },
        })),
    };
}

/**
 * The breadcrumb list a job-detail JSON-LD graph carries. One builder, because
 * this exact graph was previously emitted twice from the government route —
 * once inside `generateOpportunityJsonLd` and once as a bare second script.
 *
 * The company link resolves through `CompanySlugger` on `/companies/{slug}`, so
 * `slugify(company)` alone can name a page that route does not know. Detail
 * routes attach the canonical `companySlug`; this falls back to the name slug
 * only when the payload carries none.
 */
function buildCompanyBreadcrumbs(opportunity: Opportunity, base: string) {
    const isInternSeo = isInternshipOpportunity(opportunity);
    const isWalkinSeo = isWalkinOpportunity(opportunity);
    const typeLabel = isWalkinSeo ? 'Walk-ins' : isInternSeo ? 'Internships' : 'Jobs';
    const typePath = isWalkinSeo ? '/drives/walk-in' : isInternSeo ? '/jobs/internships' : '/jobs';
    const companySlug = (opportunity as { companySlug?: string }).companySlug || slugify(opportunity.company || '');

    return {
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
                item: `${base}${getOpportunityPath(getDetailType(opportunity), opportunity.slug || opportunity.id)}`
            }
        ]
    };
}
