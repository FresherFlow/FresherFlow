import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Join FresherFlow',
    description: 'Create your free account on FresherFlow — discover verified jobs, internships, and walk-ins for freshers.',
    robots: {
        index: false,
        follow: false,
    },
};

interface PageProps {
    searchParams: Promise<{ ref?: string; username?: string }>;
}

/**
 * /join?ref=<userId>&username=<handle>
 *
 * Short, shareable invite link + username prefill for u/ marketing.
 * Redirects to /login with ref and username so choose-username can prefill.
 */
export default async function JoinPage({ searchParams }: PageProps) {
    const { ref, username } = await searchParams;

    const params = new URLSearchParams({ intent: 'signup' });
    if (ref) params.set('ref', ref);
    if (username) params.set('username', username);

    redirect(`/login?${params.toString()}`);
}
