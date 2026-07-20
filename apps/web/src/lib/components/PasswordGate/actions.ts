'use server';

import { cookies } from 'next/headers';

export async function verifyPassword(user: string, pw: string, cookieName: string) {
    const expectedUser = process.env.BASIC_AUTH_USER || '';
    const expectedPw = process.env.BASIC_AUTH_PASSWORD || '';
    
    // Very basic protection to prevent arbitrarily setting any cookie name
    if (!cookieName || !cookieName.endsWith('_auth')) {
        return { success: false };
    }

    if ((!expectedUser || user === expectedUser) && (!expectedPw || pw === expectedPw)) {
        const cookieStore = await cookies();
        cookieStore.set(cookieName, '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });
        return { success: true };
    }
    return { success: false };
}
