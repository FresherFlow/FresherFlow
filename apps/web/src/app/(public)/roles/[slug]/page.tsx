import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { SITE_URL, CDN_URL } from '@/lib/utils/runtimeConfig';
import { slugify } from '@fresherflow/utils/slugify';
import { unstable_noStore } from 'next/cache';

export const revalidate = false;
export const dynamicParams = false;

const ROLE_OVERRIDES: Record<string, { label: string; keywords: string[] }> = {
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

const ROLE_MIN_JOBS = 5;

export async function generateStaticParams() {
    try {
        const feed = await fetchBootstrapFeed(false, undefined, true);
        const counts = new Map<string, number>();

        for (const opp of feed?.opportunities || []) {
            const titleLower = (opp.title || '').toLowerCase();
            const jfSlug = opp.jobFunction ? slugify(opp.jobFunction) : null;

            for (const [slug, roleInfo] of Object.entries(ROLE_OVERRIDES)) {
                // Match by jobFunction slug
                if (jfSlug === slug) {
                    counts.set(slug, (counts.get(slug) ?? 0) + 1);
                    continue;
                }
                // Match by keyword in title
                if (roleInfo.keywords.some(kw => titleLower.includes(kw))) {
                    counts.set(slug, (counts.get(slug) ?? 0) + 1);
                }
            }
        }

        // Always include all curated overrides - they are hand-picked and guaranteed valid
        const slugs = new Set(Object.keys(ROLE_OVERRIDES));
        // Also include feed-derived roles that clear the threshold
        for (const [slug, count] of counts) {
            if (count >= ROLE_MIN_JOBS && !slugs.has(slug)) slugs.add(slug);
        }

        return Array.from(slugs).map(slug => ({ slug }));
    } catch {
        return Object.keys(ROLE_OVERRIDES).map(slug => ({ slug }));
    }
}

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    let roleInfo = ROLE_OVERRIDES[slug];

    if (!roleInfo) {
        // Dynamically fallback for parsed roles not in the hardcoded list
        const label = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        roleInfo = { label, keywords: [label.toLowerCase()] };
    }

    const title = `${roleInfo.label} Jobs for Freshers | Entry-Level Opportunities`;
    const description = `Find verified ${roleInfo.label} jobs, internships and off-campus opportunities for freshers with direct apply links and eligibility details.`;
    const base = SITE_URL.replace(/\/+$/, '');
    const slugNormalized = slugify(decodeURIComponent(slug));
    const ogImageUrl = `${CDN_URL}/og/roles/${slugNormalized}.png`;

    return {
        title,
        description,
        alternates: {
            canonical: `${base}/roles/${slug}`
        },
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
        }
    };
}

export default async function RolePage({ params }: Props) {
    const { slug: rawSlug } = await params;
    
    // Ensure canonical lowercased slug
    const decodedSlug = decodeURIComponent(rawSlug);
    const properSlug = slugify(decodedSlug);
    
    if (!properSlug) {
        notFound();
    }
    
    if (rawSlug !== properSlug) {
        permanentRedirect(`/roles/${properSlug}`);
    }
    
    const slug = properSlug;
    
    let roleInfo = ROLE_OVERRIDES[slug];

    if (!roleInfo) {
        // Dynamically fallback for parsed roles not in the hardcoded list
        const label = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        roleInfo = { label, keywords: [label.toLowerCase()] };
    }

    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    const keywordRegexes = roleInfo.keywords.map(kw => new RegExp(`\\b${kw}\\b`, 'i'));

    const filtered = opportunities.filter(opp => {
        // 1. Check tags
        const hasTagMatch = opp.tags?.some((t: string) => slugify(t) === slug);
        if (hasTagMatch) return true;

        // 2. Check jobFunction
        if (opp.jobFunction) {
            const jfSlug = slugify(opp.jobFunction);
            if (jfSlug === slug) return true;
            if (jfSlug === 'engineering' && slug === 'software-engineer') return true;
        }

        // 3. Check title keywords
        const titleLower = opp.title.toLowerCase();
        const matchesKeyword = keywordRegexes.some(regex => regex.test(titleLower));
        if (matchesKeyword) return true;

        // 4. Fallback to title string mapping
        return false;
    });

    if (filtered.length === 0) {
        unstable_noStore();
        notFound();
    }

    const seoText = `Looking for ${roleInfo.label} positions as a fresher or recent graduate? We manually aggregate and verify every off-campus drive, associate role, and tech internship matching these qualifications. Apply directly on the official careers portals using the links provided. Verify candidate criteria, batch years, and key skills to maximize your application success.`;

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage 
                type={null} 
                initialData={{
                    opportunities: filtered,
                    total: filtered.length,
                    cachedAt: feed?.generatedAt ? new Date(feed.generatedAt).getTime() : Date.now(),
                }} 
            />
        </Suspense>
    );
}
