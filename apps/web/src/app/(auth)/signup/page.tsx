import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Create your account',
    description: 'Create your free FresherFlow account with your email — off-campus jobs, internships and walk-in drives for freshers.',
    robots: {
        index: false,
        follow: false,
    },
};

interface PageProps {
    searchParams: Promise<{ username?: string; ref?: string; redirect?: string }>;
}

// Single login shell — /signup is kept as redirect for backwards compat, no separate UI
export default async function SignupPage({ searchParams }: PageProps) {
    const { username, ref, redirect: redir } = await searchParams;
    const params = new URLSearchParams();
    if (username) params.set('username', username);
    if (ref) params.set('ref', ref);
    if (redir) params.set('redirect', redir);
    const qs = params.toString();
    redirect(qs ? `/login?${qs}` : '/login');
}
