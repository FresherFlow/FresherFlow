import prisma from '../lib/prisma';
import { User } from '@fresherflow/database';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store (In production, use Redis)
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

// ─── Referral helpers ─────────────────────────────────────────────────────────

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genReferralCode(len = 6): string {
    let code = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) code += REF_CHARS[bytes[i]! % REF_CHARS.length];
    return code;
}

async function uniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = genReferralCode();
        const exists = await prisma.user.findFirst({ where: { referralCode: code }, select: { id: true } });
        if (!exists) return code;
    }
    // Fallback: uuid prefix
    return genReferralCode(8);
}

async function bindReferral(newUserId: string, refCode: string | undefined | null): Promise<void> {
    if (!refCode) return;
    const referrer = await prisma.user.findFirst({
        where: { referralCode: refCode.toUpperCase() },
        select: { id: true },
    });
    if (!referrer || referrer.id === newUserId) return; // self-referral guard
    await prisma.user.update({
        where: { id: newUserId },
        data: { referredByUserId: referrer.id, referredAt: new Date() },
    });
    // Mark the most-recent visit from this code as converted
    const visit = await prisma.referralVisit.findFirst({
        where: { referralCode: refCode.toUpperCase(), visitorUserId: null },
        orderBy: { createdAt: 'desc' },
    });
    if (visit) {
        await prisma.referralVisit.update({
            where: { id: visit.id },
            data: { visitorUserId: newUserId },
        });
    }
}

export class AuthService {
    /**
     * Verify Google ID Token and return/create user
     */
    static async verifyGoogleIdToken(idToken: string, refCode?: string): Promise<{ user: User; isNewUser: boolean }> {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new Error('Invalid Google Token');
        }

        const email = payload.email.toLowerCase();
        const fullName = payload.name;
        const providerId = payload.sub;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        const referralCode = await uniqueReferralCode();

        // Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: { provider: 'google', providerId },
            create: {
                email,
                fullName: fullName || email.split('@')[0],
                provider: 'google',
                providerId,
                referralCode,
                profile: { create: { completionPercentage: 0 } },
            },
            include: { profile: true },
        });

        const isNewUser = !existingUser;
        if (isNewUser) await bindReferral(user.id, refCode);

        return { user, isNewUser };
    }

    /**
     * Generate and store OTP
     */
    static generateOtp(email: string): string {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        otpStore.set(email.toLowerCase(), { code, expiresAt });

        return code;
    }

    /**
     * Verify OTP and return/create user
     */
    static async verifyOtp(email: string, code: string, refCode?: string): Promise<{ user: User; isNewUser: boolean }> {
        const stored = otpStore.get(email.toLowerCase());

        if (!stored) {
            throw new Error('No OTP found or expired');
        }

        if (stored.expiresAt < new Date()) {
            otpStore.delete(email.toLowerCase());
            throw new Error('OTP expired');
        }

        if (stored.code !== code) {
            throw new Error('Invalid verification code');
        }

        // Success - clean up
        otpStore.delete(email.toLowerCase());

        const normalizedEmail = email.toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        const referralCode = await uniqueReferralCode();

        // Upsert User
        const user = await prisma.user.upsert({
            where: { email: normalizedEmail },
            update: { provider: 'email' },
            create: {
                email: normalizedEmail,
                fullName: email.split('@')[0],
                provider: 'email',
                referralCode,
                profile: { create: { completionPercentage: 0 } },
            },
            include: { profile: true },
        });

        const isNewUser = !existingUser;
        if (isNewUser) await bindReferral(user.id, refCode);

        return { user, isNewUser };
    }
}
