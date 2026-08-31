import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/api/rateLimit';

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};

async function logout() {
    const cookieStore = await cookies();
    
    // Clear cookies
    cookieStore.delete({ name: 'accessToken', ...COOKIE_OPTIONS });
    cookieStore.delete({ name: 'refreshToken', ...COOKIE_OPTIONS });
    cookieStore.delete({ name: 'ff_logged_in', ...COOKIE_OPTIONS, httpOnly: false });

    return NextResponse.json({ success: true }, { status: 200 });
}

export const POST = withRateLimit(logout, { windowMs: 60_000, max: 60, keyPrefix: 'auth-logout' });
