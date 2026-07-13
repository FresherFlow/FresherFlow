import prisma from '../../infrastructure/database/prisma';
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
}

export class AuthService {
    /**
     * Verify Google ID Token and return/create user
     */
    static async verifyGoogleIdToken(idToken: string, refCode?: string, firebaseUid?: string): Promise<{ user: User; isNewUser: boolean }> {
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
        // const providerId = payload.sub;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        const referralCode = await uniqueReferralCode();

        // Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                ...(firebaseUid ? { firebase_uid: firebaseUid } : {})
            },
            create: {
                email,
                fullName: fullName || email.split('@')[0],
                referralCode,
                ...(firebaseUid ? { firebase_uid: firebaseUid } : {}),
                profile: { create: { completionPercentage: 0 } },
            },
            include: { profile: true },
        });

        const isNewUser = !existingUser;
        if (isNewUser) await bindReferral(user.id as string, refCode);

        return { user: user as unknown as User, isNewUser };
    }

    /**
     * Generate and store OTP
     */
    static generateOtp(email: string): string {
        const code = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        otpStore.set(email.toLowerCase(), { code, expiresAt });

        return code;
    }

    /**
     * Verify OTP and return/create user
     */
    static async verifyOtp(email: string, code: string, refCode?: string, firebaseUid?: string): Promise<{ user: User; isNewUser: boolean }> {
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
            update: {
                ...(firebaseUid ? { firebase_uid: firebaseUid } : {})
            },
            create: {
                email: normalizedEmail,
                fullName: email.split('@')[0],
                referralCode,
                ...(firebaseUid ? { firebase_uid: firebaseUid } : {}),
                profile: { create: { completionPercentage: 0 } },
            },
            include: { profile: true },
        });

        const isNewUser = !existingUser;
        if (isNewUser) await bindReferral(user.id as string, refCode);

        return { user: user as unknown as User, isNewUser };
    }

    /**
     * Handshake logic for Firebase identity mapping.
     * Idempotent: returns existing user if firebase_uid matches,
     * links existing email-based account if found,
     * or creates a new user (Guest or Registered).
     */
    static async handshake(uid: string, email?: string, name?: string, refCode?: string): Promise<{ user: User; isNewUser: boolean }> {
        const normalizedEmail = email?.toLowerCase();

        // 1. Check for existing user by firebase_uid
        const existingByFirebase = await prisma.user.findUnique({
            where: { firebase_uid: uid },
            include: { profile: true }
        });

        if (existingByFirebase) {
            // If the user was anonymous but now we have an email, PROMOTE them
            if (existingByFirebase.isAnonymous && normalizedEmail) {
                const promotedUser = await prisma.user.update({
                    where: { id: existingByFirebase.id as string },
                    data: {
                        email: normalizedEmail,
                        fullName: (name || existingByFirebase.fullName || normalizedEmail.split('@')[0]) as string,
                        isAnonymous: false,
                    },
                    include: { profile: true }
                });
                return { user: promotedUser as unknown as User, isNewUser: false };
            }
            return { user: existingByFirebase as unknown as User, isNewUser: false };
        }

        // 2. Check for existing account by email (Linking)
        // Only if we actually have an email in this handshake
        if (normalizedEmail) {
            const existingByEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail },
                include: { profile: true }
            });

            if (existingByEmail) {
                const linkedUser = await prisma.user.update({
                    where: { id: existingByEmail.id as string },
                    data: {
                        firebase_uid: uid,
                    },
                    include: { profile: true }
                });

                return { user: linkedUser as unknown as User, isNewUser: false };
            }
        }

        // 3. Create new user (Guest or Registered)
        const referralCode = await uniqueReferralCode();
        const newUser = await prisma.user.create({
            data: {
                firebase_uid: uid,
                email: normalizedEmail,
                fullName: (name || normalizedEmail?.split('@')[0] || 'Guest') as string,
                isAnonymous: !normalizedEmail, // If no email, it's a guest
                referralCode,
                profile: { create: { completionPercentage: 0 } },
            },
            include: { profile: true }
        });

        const isNewUser = true;
        if (isNewUser) await bindReferral(newUser.id as string, refCode);

        return { user: newUser as unknown as User, isNewUser };
    }
}
