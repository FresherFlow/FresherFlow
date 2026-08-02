export const revalidate = 300; // ISR: re-render every 5min (CDN serves; Render never touched)

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import PublicProfileClient from './PublicProfileClient';

type Props = {
    params: Promise<{ username: string }>;
};

type CandidateProject = {
    id: string;
    title: string;
    description: string;
    skills: string[];
    githubUrl?: string;
    liveUrl?: string;
};

type PublicProfileData = {
    user: {
        id?: string;
        fullName: string | null;
        username: string;
        createdAt: string;
    };
    profile: {
        headline: string | null;
        about: string | null;
        skills: string[];
        gradCourse: string | null;
        gradSpecialization: string | null;
        gradYear: number | null;
        educationLevel: string | null;
        pgCourse?: string | null;
        pgSpecialization?: string | null;
        pgYear?: number | null;
        tenthYear?: number | null;
        twelfthYear?: number | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        portfolioUrl: string | null;
        resumeUrl?: string | null;
        otherLinks?: { label: string; url: string; type: string }[];
        availability: string | null;
        preferredCities: string[];
        workModes: string[];
        interestedIn?: string[];
        preferredRoles?: string[];
        openToRecruiters: boolean;
        openToRelocate?: boolean;
        completionPercentage?: number | null;
        homeState?: string | null;
        visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' | string | null;
        projects?: CandidateProject[];
        githubPinnedRepos?: any;
    };
};

function getApiBaseUrl(): string {
    const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_USER_API_URL;
    if (envUrl) return envUrl.replace(/\/+$/, '');
    if (process.env.NODE_ENV === 'development') return 'http://localhost:5000';
    return 'https://api.fresherflow.in';
}

function getCdnBaseUrl(): string {
    return (process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in').replace(/\/+$/, '');
}

async function fetchPublicProfile(username: string): Promise<PublicProfileData | null> {
    // 1. Try CDN first — Cloudflare serves this, zero Render/API hits
    try {
        const cdnUrl = `${getCdnBaseUrl()}/profiles/${username}.json`;
        const cdnRes = await fetch(cdnUrl, { next: { revalidate: 300 } });
        if (cdnRes.ok) {
            const json = await cdnRes.json();
            return json.data || json;
        }
    } catch {
        // CDN miss or unavailable — fall through to API
    }

    // 2. Fallback: hit the API (for profiles not yet written to R2)
    try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/profile/public/${username}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json.data || json;
    } catch {
        return null;
    }
}

function calculateProfileCompleteness(profile: PublicProfileData['profile']): number {
    if (typeof profile.completionPercentage === 'number' && profile.completionPercentage > 0) {
        return profile.completionPercentage;
    }
    let score = 0;
    if (profile.about && profile.about.trim().length > 0) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 20;
    if (profile.gradCourse || profile.educationLevel || profile.pgCourse) score += 20;
    if (profile.projects && profile.projects.length > 0) score += 20;
    if (profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.resumeUrl) score += 20;
    return score;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    const data = await fetchPublicProfile(username);
    
    if (!data || data.profile.visibility === 'PRIVATE') {
        return {
            title: 'Candidate Profile Not Found',
            robots: { index: false, follow: false },
        };
    }

    const completeness = calculateProfileCompleteness(data.profile);
    const visibility = data.profile.visibility || 'PUBLIC';
    const isNoIndex = completeness < 50 || visibility === 'UNLISTED';

    const name = data.user.fullName || 'Candidate';
    const headline = data.profile.headline || 'Software Engineer';
    const qual = [data.profile.gradCourse, data.profile.gradYear].filter(Boolean).join(' • ');
    const topSkills = data.profile.skills?.length ? `Skills: ${data.profile.skills.slice(0, 4).join(' • ')}` : '';
    const description = [headline, qual, topSkills, 'FresherFlow Candidate Profile'].filter(Boolean).join(' | ');

    // Root layout template (%s | FresherFlow) appends "| FresherFlow" automatically
    const title = `${name} – ${headline}`;

    return {
        title,
        description,
        robots: isNoIndex
            ? { index: false, follow: false }
            : { index: true, follow: true },
        alternates: { canonical: `https://fresherflow.in/u/${username}` },
        openGraph: {
            title,
            description,
            type: 'profile',
            username,
            url: `https://fresherflow.in/u/${username}`,
            siteName: 'FresherFlow',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export default async function PublicProfilePage({ params }: Props) {
    const { username } = await params;
    const data = await fetchPublicProfile(username);

    if (!data) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
                <div className="flex-1 py-16 px-4 flex items-center justify-center">
                    <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-4 shadow-sm">
                        <div className="w-16 h-16 bg-muted text-muted-foreground font-bold text-2xl rounded-2xl flex items-center justify-center mx-auto border border-border/50">
                            <UserIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Candidate Profile Not Found</h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            No public candidate profile exists for <span className="font-semibold text-foreground">@{username}</span>.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 transition-opacity shadow-sm"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (data.profile.visibility === 'PRIVATE') {
        notFound();
    }

    const name = data.user.fullName || 'Candidate';
    const headline = data.profile.headline || 'Software Engineer';
    const canonicalUrl = `https://fresherflow.in/u/${username}`;
    const socialLinks = [data.profile.githubUrl, data.profile.linkedinUrl, data.profile.portfolioUrl]
        .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
        .map(url => url.startsWith('http') ? url : `https://${url}`);

    const personJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
        jobTitle: headline,
        url: canonicalUrl,
        sameAs: socialLinks.length > 0 ? socialLinks : undefined,
        knowsAbout: data.profile.skills || [],
        description: data.profile.about || headline,
        ...(data.profile.gradCourse ? {
            alumniOf: {
                '@type': 'EducationalOrganization',
                name: data.profile.gradCourse,
            }
        } : {})
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
            />
            <PublicProfileClient data={data} />
        </>
    );
}
