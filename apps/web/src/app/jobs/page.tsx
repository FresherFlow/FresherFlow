import { Metadata } from 'next';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { OpportunityType } from '@fresherflow/types';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Jobs for Freshers',
    description: 'Discover full-time job opportunities for freshers across India. Apply to verified openings at top companies with detailed eligibility criteria and direct application links.',
    keywords: 'fresher jobs, full-time jobs, entry level jobs, graduate jobs, jobs for freshers india, off campus jobs',
    openGraph: {
        title: 'Jobs for Freshers | FresherFlow',
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
        title: 'Jobs for Freshers | FresherFlow',
        description: 'Discover full-time job opportunities for freshers across India.',
        images: ['/main.png'],
    },
};

export default function JobsPage() {
    return <CategoryPage type={OpportunityType.JOB} />;
}
