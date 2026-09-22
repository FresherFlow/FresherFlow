import prisma from '../../infrastructure/database/prisma';
import { User } from '@fresherflow/database';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { AppError } from '../../middleware/errorHandler';


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store (dub + openship pattern: 10m expiry, 5 attempts/24h lockout)
// Adapted from dub EmailVerificationToken (10m) + openship emailOTP (6, 600s, 5 attempts)
// No password handling — OTP only, mobile one-time-code autofill
const otpStore = new Map<string, { code: string; expiresAt: Date }>();
const otpAttempts = new Map<string, { count: number; firstAt: number; lockedUntil?: number }>();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10m — dub 10m / openship 600s
const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 6 * 60 * 60 * 1000; // 6h lockout after 5 fails (was 24h, per request)

function getAttemptKey(email: string) {
    return email.toLowerCase();
}
function isLocked(email: string): { locked: boolean; retryAfterMs?: number } {
    const rec = otpAttempts.get(getAttemptKey(email));
    if (!rec || !rec.lockedUntil) return { locked: false };
    if (Date.now() < rec.lockedUntil) return { locked: true, retryAfterMs: rec.lockedUntil - Date.now() };
    // lock expired
    otpAttempts.delete(getAttemptKey(email));
    return { locked: false };
}
function recordFailedAttempt(email: string) {
    const key = getAttemptKey(email);
    const now = Date.now();
    const rec = otpAttempts.get(key);
    if (!rec || now - rec.firstAt > OTP_LOCKOUT_MS) {
        otpAttempts.set(key, { count: 1, firstAt: now });
        return;
    }
    rec.count += 1;
    if (rec.count >= OTP_MAX_ATTEMPTS) {
        rec.lockedUntil = now + OTP_LOCKOUT_MS;
    }
    otpAttempts.set(key, rec);
}
function clearAttempts(email: string) {
    otpAttempts.delete(getAttemptKey(email));
}

// ─── Referral helpers ─────────────────────────────────────────────────────────

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
            include: { profile: true, organizationMemberships: { include: { organization: true } } },
        });

        const isNewUser = !existingUser;
        if (isNewUser) await bindReferral(user.id as string, refCode);

        return { user: user as unknown as User, isNewUser };
    }

    /**
     * Generate and store OTP — adapted: dub 10m + openship emailOTP 600s, clean single-purpose
     */
    static generateOtp(email: string): string {
        const key = email.toLowerCase();
        const locked = isLocked(key);
        if (locked.locked) {
            const hrs = Math.ceil((locked.retryAfterMs || 0) / 3600000);
            throw new AppError(`Too many failed attempts. Try again in ${hrs}h.`, 429);
        }
        const code = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        otpStore.set(key, { code, expiresAt });
        // reset attempts on new code (openship behavior: resend clears prior count)
        clearAttempts(key);

        return code;
    }

    /**
     * Verify OTP and return/create user — adapted: dub 5/24h lockout + openship expired/too-many handling
     */
    static async verifyOtp(email: string, code: string, refCode?: string, firebaseUid?: string): Promise<{ user: User; isNewUser: boolean }> {
        const key = email.toLowerCase();
        const locked = isLocked(key);
        if (locked.locked) {
            throw new AppError('Too many failed attempts. Try again later.', 429);
        }
        const stored = otpStore.get(key);

        if (!stored) {
            throw new Error('No OTP found or expired');
        }

        if (stored.expiresAt < new Date()) {
            otpStore.delete(key);
            throw new Error('OTP expired. Please request a new one.');
        }

        if (stored.code !== code) {
            recordFailedAttempt(key);
            const rec = otpAttempts.get(key);
            if (rec?.lockedUntil) throw new AppError('Too many failed attempts. Try again later.', 429);
            throw new AppError('Invalid verification code', 401);
        }

        // Success - clean up
        otpStore.delete(key);
        clearAttempts(key);

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
            include: { profile: true, organizationMemberships: { include: { organization: true } } },
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
            include: { profile: true, organizationMemberships: { include: { organization: true } } }
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
                    include: { profile: true, organizationMemberships: { include: { organization: true } } }
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
                include: { profile: true, organizationMemberships: { include: { organization: true } } }
            });

            if (existingByEmail) {
                const linkedUser = await prisma.user.update({
                    where: { id: existingByEmail.id as string },
                    data: {
                        firebase_uid: uid,
                    },
                    include: { profile: true, organizationMemberships: { include: { organization: true } } }
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
            include: { profile: true, organizationMemberships: { include: { organization: true } } }
        });

        const isNewUser = true;
        if (isNewUser) await bindReferral(newUser.id as string, refCode);

        return { user: newUser as unknown as User, isNewUser };
    }
}
