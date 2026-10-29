import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO } from '@fresherflow/types';
import { isInternshipOpportunity } from '@/features/jobs/utils/walkinMapUtils';

// No timer, by design — see `lib/api/cdnFeed.ts` for the full policy.
// Freshness arrives when the API says so: a rebuild calls /api/revalidate,
// which marks the feed tags stale, and the next request regenerates this
// page once. A worker sweep re-sends those tags if that call was lost.
// A number here would make every visitor and crawler pay for a full render.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Internships for Students & Freshers in India',
    description: 'Find verified internships for students and freshers in India, including paid internships, technical internships and career-start opportunities.',
    alternates: {
        canonical: '/jobs/internships',
    },
    openGraph: {
        title: 'Internships for Students & Freshers in India',
        description: 'Find verified internships for students and freshers in India, including paid internships, technical internships and career-start opportunities.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified internships on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Internships for Students & Freshers in India',
        description: 'Find verified internships for students and freshers in India, including paid internships, technical internships and career-start opportunities.',
        images: ['/main.png'],
    },
};

export default async function InternshipsPage() {
    const bootstrapData = await fetchFeedIndex();
    const internshipOpps = (bootstrapData?.opportunities || []).filter(o => isInternshipOpportunity(o));
    const initialData = internshipOpps.length ? {
        opportunities: internshipOpps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: internshipOpps.length,
        cachedAt: new Date(bootstrapData?.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type="INTERNSHIP" initialData={initialData} />;
}
