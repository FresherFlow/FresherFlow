import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import prisma from '@fresherflow/database';
import { generateAccessToken, generateRefreshToken } from '@fresherflow/utils';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { withRateLimit } from '@/lib/api/rateLimit';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genReferralCode(len = 6): string {
    let code = '';
    for (let i = 0; i < len; i++) {
        code += REF_CHARS[crypto.randomInt(0, REF_CHARS.length)];
    }
    return code;
}

async function uniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = genReferralCode();
        const exists = await prisma.user.findFirst({ where: { referralCode: code }, select: { id: true } });
        if (!exists) return code;
    }
    return genReferralCode(8);
}

async function bindReferral(newUserId: string, refCode: string | undefined | null): Promise<void> {
    if (!refCode) return;
    const referrer = await prisma.user.findFirst({
        where: { referralCode: refCode.toUpperCase() },
        select: { id: true },
    });
    if (!referrer || referrer.id === newUserId) return;
    await prisma.user.update({
        where: { id: newUserId },
        data: { referredByUserId: referrer.id, referredAt: new Date() },
    });
}

async function createLocalSession(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            return NextResponse.json({ error: 'Invalid or expired Firebase token' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { ref: refCode } = body;
        
        const { uid, email, name } = decodedToken;
        const normalizedEmail = email?.toLowerCase();

        let user;
        let isNewUser = false;
        
        // 1. Check for existing user by firebase_uid
        const existingByFirebase = await prisma.user.findUnique({
            where: { firebase_uid: uid },
            include: { profile: true }
        });

        if (existingByFirebase) {
            if (existingByFirebase.isAnonymous && normalizedEmail) {
                user = await prisma.user.update({
                    where: { id: existingByFirebase.id as string },
                    data: {
                        email: normalizedEmail,
                        fullName: (name || existingByFirebase.fullName || normalizedEmail.split('@')[0]) as string,
                        isAnonymous: false,
                    },
                    include: { profile: true }
                });
            } else {
                user = existingByFirebase;
            }
        } else if (normalizedEmail) {
            // 2. Check for existing account by email (Linking)
            const existingByEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                include: { profile: true }
            });

            if (existingByEmail) {
                user = await prisma.user.update({
                    where: { id: existingByEmail.id as string },
                    data: {
                        firebase_uid: uid,
                    },
                    include: { profile: true }
                });
            }
        }
        
        if (!user) {
            // 3. Create new user (Guest or Registered)
            const referralCode = await uniqueReferralCode();
            user = await prisma.user.create({
                data: {
                    firebase_uid: uid,
                    email: normalizedEmail,
                    fullName: (name || normalizedEmail?.split('@')[0] || 'Guest') as string,
                    isAnonymous: !normalizedEmail,
                    referralCode,
                    profile: { create: { completionPercentage: 0 } },
                },
                include: { profile: true }
            });
            isNewUser = true;
            if (isNewUser) await bindReferral(user.id as string, refCode);
        }

        // Set session cookies
        const accessToken = generateAccessToken(user.id as string);
        const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id as string);

        await prisma.refreshToken.create({
            data: {
                userId: user.id as string,
                tokenHash,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS)
            }
        });

        const cookieStore = await cookies();
        cookieStore.set('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_MAX_AGE_MS / 1000 });
        cookieStore.set('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_MAX_AGE_MS / 1000 });
        cookieStore.set('ff_logged_in', 'true', { ...COOKIE_OPTIONS, httpOnly: false, maxAge: REFRESH_TOKEN_MAX_AGE_MS / 1000 });

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email || null,
                fullName: user.fullName || null,
                username: user.username || null
            },
            profile: user.profile || null,
            accessToken,
            refreshToken
        }, { status: 200 });

    } catch (error) {
        console.error('Local session auth error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const POST = withRateLimit(createLocalSession, { windowMs: 60_000, max: 10, keyPrefix: 'auth-local-session' });
