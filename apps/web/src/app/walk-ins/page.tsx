import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Walk-in Drives & Campus Hiring | FresherFlow',
    description: 'Discover walk-in interview drives and on-campus recruitment events near you. Get complete venue details, timing, required documents, and eligibility for immediate hiring opportunities.',
    keywords: 'walk-in drives, walk-in interviews, campus placement, fresher walk-ins, direct walk-in jobs, on-campus hiring, immediate hiring',
    openGraph: {
        title: 'Walk-in Drives & Campus Hiring | FresherFlow',
        description: 'Discover walk-in interview drives and on-campus recruitment events across India.',
        type: 'website',
        images: [
            {
                url: '/main.png',
                width: 1200,
                height: 630,
                alt: 'Verified walk-in drives on FresherFlow',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Walk-in Drives & Campus Hiring | FresherFlow',
        description: 'Discover walk-in interview drives and on-campus recruitment events across India.',
        images: ['/main.png'],
    },
};

export default function WalkInsPage() {
    return <CategoryPage type={OpportunityType.WALKIN} />;
}
