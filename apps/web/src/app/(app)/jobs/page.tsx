import { Metadata } from 'next';
import { Suspense } from 'react';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { formatJobFeedTitle } from '@/features/opportunities/utils/formatJobFeedTitle';
import { OpportunityType, toOpportunityCardDTO } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : undefined;
    const mode = params.mode;
    const location = typeof params.location === 'string' ? params.location : undefined;
    const skills = typeof params.skills === 'string' ? params.skills.split(',') : undefined;
    const sector = typeof params.sector === 'string' ? params.sector : undefined;
    const course = typeof params.course === 'string' ? params.course : undefined;
    const type = typeof params.type === 'string' ? params.type.toUpperCase() as OpportunityType : null;

    const dynamicTitle = formatJobFeedTitle({
        type: type,
        workMode: mode,
        location,
        skills,
        sector,
        course,
        search: q
    });

    const title = dynamicTitle || 'Job Opportunities Feed';

    return {
        title,
        description: 'A verified feed of off-campus jobs, internships, and walk-in drives for fresh graduates. Every link is checked. No spam.',
        keywords: 'fresher jobs, full-time jobs, entry level jobs, graduate jobs, jobs for freshers india, off campus jobs, internships, walk-ins',
        alternates: {
            canonical: '/jobs',
        },
        openGraph: {
            title,
            description: 'Discover full-time job opportunities for freshers across India.',
            type: 'website',
            images: [
                {
                    url: '/main.png',
                    width: 1200,
                    height: 630,
                    alt: 'Verified fresher jobs on FresherFlow',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description: 'Discover full-time job opportunities for freshers across India.',
            images: ['/main.png'],
        },
    };
}

export default async function JobsPage() {
    const bootstrapData = await fetchBootstrapFeed(false, undefined, true);
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.map(toOpportunityCardDTO) as any,
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return (
        <Suspense fallback={<FeedPageSkeleton />}>
            <CategoryPage type={null} initialData={initialData} />
        </Suspense>
    );
}
