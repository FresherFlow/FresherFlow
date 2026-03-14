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
    searchParams: Promise<{ ref?: string }>;
}

/**
 * /join?ref=<userId>
 *
 * Short, shareable invite link. Redirects to /login with the ref
 * so the existing invite attribution flow is preserved without
 * exposing UTM parameters in the shared URL.
 */
export default async function JoinPage({ searchParams }: PageProps) {
    const { ref } = await searchParams;

    const loginUrl = new URL('/login', 'https://fresherflow.in');
    loginUrl.searchParams.set('intent', 'signup');
    if (ref) loginUrl.searchParams.set('ref', ref);

    // Relative redirect — works in any environment
    const destination = `/login?intent=signup${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
    redirect(destination);
}
