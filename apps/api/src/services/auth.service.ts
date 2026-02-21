import prisma from '../lib/prisma';
import { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store (In production, use Redis)
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

export class AuthService {
    /**
     * Verify Google ID Token and return/create user
     */
    static async verifyGoogleIdToken(idToken: string): Promise<{ user: User; isNewUser: boolean }> {
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

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        // Upsert User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                provider: 'google',
                providerId
            },
            create: {
                email,
                fullName: fullName || email.split('@')[0],
                provider: 'google',
                providerId,
                profile: {
                    create: {
                        completionPercentage: 0
                    }
                }
            },
            include: {
                profile: true
            }
        });

        return {
            user,
            isNewUser: !existingUser
        };
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
    static async verifyOtp(email: string, code: string): Promise<{ user: User; isNewUser: boolean }> {
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
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        // Upsert User
        const user = await prisma.user.upsert({
            where: { email: email.toLowerCase() },
            update: {
                provider: 'email'
            },
            create: {
                email: email.toLowerCase(),
                fullName: email.split('@')[0],
                provider: 'email',
                profile: {
                    create: {
                        completionPercentage: 0
                    }
                }
            },
            include: {
                profile: true
            }
        });

        return {
            user,
            isNewUser: !existingUser
        };
    }
}
