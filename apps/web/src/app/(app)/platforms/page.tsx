import type { Metadata } from 'next';
import platformsData from '@/data/internship-platforms.json';
import { PlatformsPageView } from '@/features/platforms/components/PlatformsPageView';
import type { InternshipPlatform } from '@/features/platforms/types';

export const metadata: Metadata = {
    title: 'Internship Platforms & Directories for Students',
    description: 'Curated directory of internship platforms, job boards, GitHub repositories, coding practice tools, startup boards, research and government programs for students and freshers.',
    keywords: 'internship platforms, internship job boards, internship directories, find internships, coding practice, internship resources, fresher internships',
    alternates: {
        canonical: '/platforms',
    },
    openGraph: {
        title: 'Internship Platforms & Directories for Students',
        description: 'Curated directory of internship platforms, job boards, coding practice tools and more for students and freshers.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Internship Platforms & Directories for Students',
        description: 'Curated directory of internship platforms, job boards, coding practice tools and more for students and freshers.',
    },
};

export default function PlatformsPage() {
    return (
        <PlatformsPageView
            resources={(platformsData as { resources: InternshipPlatform[] }).resources}
            title={typeof metadata.title === 'string' ? metadata.title : 'Internship Platforms & Directories for Students'}
            description={metadata.description as string}
            badge="Curated Directory"
        />
    );
}
