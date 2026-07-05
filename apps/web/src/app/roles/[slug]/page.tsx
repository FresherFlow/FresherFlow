import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import ProgrammaticHub from '@/features/opportunities/components/ProgrammaticHub';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;
export const dynamicParams = true;

const VALID_ROLES = {
    'software-engineer': {
        label: 'Software Engineer',
        keywords: ['software engineer', 'software developer', 'sde', 'full stack developer', 'backend developer', 'frontend developer', 'engineer', 'developer', 'programmer'],
    },
    'data-analyst': {
        label: 'Data Analyst',
        keywords: ['data analyst', 'business intelligence', 'bi analyst', 'data analytics', 'data scientist', 'machine learning', 'ml engineer'],
    },
    'business-analyst': {
        label: 'Business Analyst',
        keywords: ['business analyst', 'ba', 'product analyst', 'consultant'],
    },
    'frontend-developer': {
        label: 'Frontend Developer',
        keywords: ['frontend developer', 'frontend engineer', 'ui developer', 'web developer', 'react developer', 'angular developer'],
    },
    'test-engineer': {
        label: 'Test Engineer',
        keywords: ['test engineer', 'qa', 'quality assurance', 'testing engineer', 'sdet', 'automation engineer', 'manual testing', 'tester'],
    }
};

export async function generateStaticParams() {
    return Object.keys(VALID_ROLES).map(slug => ({
        slug
    }));
}

type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    let roleInfo = VALID_ROLES[slug as keyof typeof VALID_ROLES];

    if (!roleInfo) {
        // Dynamically fallback for parsed roles not in the hardcoded list
        const label = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        roleInfo = { label, keywords: [label.toLowerCase()] };
    }

    const title = `${roleInfo.label} Jobs for Freshers 2026`;
    const description = `Explore verified off-campus job openings, entry-level vacancies, and internships for ${roleInfo.label}s. Direct apply links and zero spam.`;
    const base = (SITE_URL || 'https://fresherflow.in').replace(/\/+$/, '');
    const { slugify } = await import('@fresherflow/utils');
    const slugNormalized = slugify(decodeURIComponent(slug));
    const ogImageUrl = `https://cdn.fresherflow.in/og/roles/${slugNormalized}.png`;

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
    const { slug } = await params;
    let roleInfo = VALID_ROLES[slug as keyof typeof VALID_ROLES];

    if (!roleInfo) {
        // Dynamically fallback for parsed roles not in the hardcoded list
        const label = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        roleInfo = { label, keywords: [label.toLowerCase()] };
    }

    const { slugify } = await import('@fresherflow/utils');
    const feed = await fetchBootstrapFeed(false, [`role-${slug}`]);
    const opportunities = feed?.opportunities || [];

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
        const matchesKeyword = roleInfo.keywords.some((keyword: string) => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            return regex.test(titleLower);
        });
        if (matchesKeyword) return true;

        return false;
    });

    if (filtered.length === 0) {
        const { unstable_noStore } = await import('next/cache');
        unstable_noStore();
        notFound();
    }

    const { extractHubRelations } = await import('@/features/opportunities/utils/hubLinking');
    const { topCompanies, relatedSkills, relatedLocations } = extractHubRelations(filtered, { role: slug });

    const lastUpdated = feed?.generatedAt 
        ? new Date(feed.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const title = `${roleInfo.label} Jobs for Freshers`;
    const description = `Find verified entry-level openings and off-campus placements for ${roleInfo.label} candidates.`;
    const seoText = `Looking for ${roleInfo.label} positions as a fresher or recent graduate? We manually aggregate and verify every off-campus drive, associate role, and tech internship matching these qualifications. Apply directly on the official careers portals using the links provided. Verify candidate criteria, batch years, and key skills to maximize your application success.`;

    return (
        <ProgrammaticHub
            title={title}
            description={description}
            seoText={seoText}
            opportunities={filtered}
            lastUpdated={lastUpdated}
            breadcrumbLabel={roleInfo.label}
            breadcrumbUrl={`/roles/${slug}`}
            parentBreadcrumb={{ label: 'Roles', href: '/roles' }}
            topCompanies={topCompanies}
            relatedSkills={relatedSkills}
            relatedLocations={relatedLocations}
        />
    );
}
