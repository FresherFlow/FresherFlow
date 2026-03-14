import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

interface PageProps {
    params: Promise<{ code: string }>;
}

/**
 * /r/[code] — short referral link
 *
 * Records the click server-side then redirects to login/signup.
 * Fires-and-forgets the click tracking so the redirect is instant.
 */
export default async function ReferralRedirectPage({ params }: PageProps) {
    const { code } = await params;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.fresherflow.in';

    // Fire-and-forget click tracking (don't block redirect)
    void fetch(`${apiUrl}/api/public/referrals/${code}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
    }).catch(() => { /* silent */ });

    // Redirect to signup with the short code as ref
    redirect(`/login?intent=signup&ref=${encodeURIComponent(code.toUpperCase())}`);
}
