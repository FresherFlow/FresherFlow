import type { Metadata } from 'next';
import { CDN_URL } from '@/lib/utils/runtimeConfig';
import { PlatformsPageView } from '@/features/platforms/components/PlatformsPageView';
import type { InternshipPlatform } from '@/features/platforms/types';

export const metadata: Metadata = {
    title: 'Internship Platforms & Resources for Students',
    description: 'A comprehensive list of internship platforms, job boards, GitHub repositories, coding practice tools, startup boards, research and government programs for students and freshers.',
    keywords: 'internship platforms, internship job boards, internship directories, find internships, coding practice, internship resources, fresher internships',
    alternates: {
        canonical: '/platforms',
    },
    openGraph: {
        title: 'Internship Platforms & Resources for Students',
        description: 'A comprehensive list of internship platforms, job boards, coding practice tools and more for students and freshers.',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Internship Platforms & Resources for Students',
        description: 'A comprehensive list of internship platforms, job boards, coding practice tools and more for students and freshers.',
    },
};

export default async function PlatformsPage() {
    let resources: InternshipPlatform[] = [];

    try {
        const res = await fetch(`${CDN_URL}/internship-platforms.json`, { next: { revalidate: 3600 } });
        if (!res.ok) {
            throw new Error(`Failed to fetch platforms data: ${res.status}`);
        }
        const data = await res.json();
        resources = Array.isArray(data.resources) ? data.resources : (Array.isArray(data) ? data : []);
    } catch (error) {
        console.warn('[platforms] CDN fetch failed:', error);
        resources = [];
    }

    return (
        <PlatformsPageView
            resources={resources}
            title={typeof metadata.title === 'string' ? metadata.title : 'Internship Platforms & Resources for Students'}
            description={metadata.description as string}
        />
    );
}
