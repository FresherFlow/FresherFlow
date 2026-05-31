import { Metadata } from 'next';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Internships for Students',
    description: 'Find internship opportunities for students and recent graduates. Explore verified internship openings with stipends, skill development programs, and career kickstart opportunities.',
    keywords: 'internships for students, paid internships, summer internships, fresher internships, internship opportunities india, student internships',
    alternates: {
        canonical: '/internships',
    },
    openGraph: {
        title: 'Internships for Students | FresherFlow',
        description: 'Find internship opportunities for students and recent graduates across India.',
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
        title: 'Internships for Students | FresherFlow',
        description: 'Find internship opportunities for students and recent graduates across India.',
        images: ['/main.png'],
    },
};

export default async function InternshipsPage() {
    const bootstrapData = await fetchBootstrapFeed();
    const initialData = bootstrapData ? {
        opportunities: bootstrapData.opportunities.filter(o => o.type === OpportunityType.INTERNSHIP),
        total: bootstrapData.count,
        cachedAt: new Date(bootstrapData.generatedAt).getTime(),
    } : null;

    return <CategoryPage type={OpportunityType.INTERNSHIP} initialData={initialData} />;
}
