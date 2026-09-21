import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { toOpportunityCardDTO, OpportunityType } from '@fresherflow/types';

// On-demand revalidation via /api/revalidate — called when jobs are published/expired.
export const revalidate = false;

export const metadata: Metadata = {
    title: 'Internships for Students & Freshers in India',
    description: 'Find verified internships for students and freshers in India, including paid internships, technical internships and career-start opportunities.',
    keywords: 'internships for students, internships for freshers, paid internships, fresher internships, internship opportunities India, technical internships',
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
    const bootstrapData = await fetchFeedIndex(false, undefined, true);
    const internshipOpps = (bootstrapData?.opportunities || []).filter(o => o.type === OpportunityType.INTERNSHIP);
    const initialData = internshipOpps.length ? {
        opportunities: internshipOpps.slice(0, FEED_PAGE_SIZE).map(toOpportunityCardDTO) as any,
        total: internshipOpps.length,
        cachedAt: new Date(bootstrapData?.generatedAt || Date.now()).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.INTERNSHIP} initialData={initialData} />;
}
