import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicProfileClient, { type PublicProfile } from '@/features/profiles/components/PublicProfileClient';
import { serverApiClient } from '@/lib/api/server-client';

export const revalidate = 60;

interface PageProps {
    params: Promise<{ username: string }>;
}

async function getProfile(username: string): Promise<PublicProfile | null> {
    try {
        const res = await serverApiClient<{ success: boolean; data: PublicProfile }>(
            `/api/public/profiles/${encodeURIComponent(username.toLowerCase())}`,
        );
        return res?.data ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { username } = await params;
    const profile = await getProfile(username);
    if (!profile) {
        return { title: 'Profile not found — FresherFlow' };
    }
    const name = profile.fullName || username;
    const headline = profile.headline || `${profile.degree || 'Fresher'} · ${profile.gradYear ?? ''}`.trim();
    return {
        title: `${name} — Fresher Profile`,
        description: headline
            ? `${headline} · Skills: ${(profile.skills || []).slice(0, 5).join(', ')}`
            : `View ${name}'s fresher profile on FresherFlow.`,
        openGraph: {
            title: `${name} — Fresher Profile`,
            description: headline || undefined,
            type: 'profile',
        },
    };
}

export default async function PublicProfilePage({ params }: PageProps) {
    const { username } = await params;
    const profile = await getProfile(username);

    if (!profile) {
        notFound();
    }

    return <PublicProfileClient profile={profile} />;
}
