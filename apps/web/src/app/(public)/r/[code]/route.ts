import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/utils/runtimeConfig';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    // Drop malicious spam traffic before hitting the backend
    if (!code || code.length > 20 || !/^[A-Za-z0-9_-]+$/.test(code)) {
        return NextResponse.redirect(new URL('/', request.url), 307);
    }

    const apiUrl = API_URL;

    // Fire-and-forget click tracking (don't block redirect)
    void fetch(`${apiUrl}/api/public/referrals/${code}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        cache: 'no-store',
    }).catch(() => { /* silent */ });

    // Redirect to signup with the short code as ref
    const signupUrl = new URL('/login', request.url);
    signupUrl.searchParams.set('intent', 'signup');
    signupUrl.searchParams.set('ref', code.toUpperCase());

    return NextResponse.redirect(signupUrl, 307);
}
