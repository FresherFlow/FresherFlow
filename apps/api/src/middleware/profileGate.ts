import { Request, Response, NextFunction } from 'express';
import prisma from '../infrastructure/database/prisma';
import { AppError } from './errorHandler';
import { calculateCompletion } from '@fresherflow/domain';
import { Profile } from '@fresherflow/types';

/**
 * Profile Gating Middleware
 * Blocks access to feed/dashboard/actions if profile completion < 100%
 */
export async function profileGate(req: Request, res: Response, next: NextFunction) {
    if (!req.userId) {
        return next(new AppError('Unauthorized', 401));
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { profile: true }
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Admins bypass profile gates
        if (user.role === 'ADMIN') {
            return next();
        }

        const profile = (user.profile as unknown as Profile) || null;

        if (!profile) {
            return next(new AppError('Profile not found. Please complete your profile.', 403));
        }

        if (calculateCompletion(profile as Profile) < 100) {
            return res.status(403).json({
                error: 'Complete your profile to access this feature',
                completionPercentage: profile.completionPercentage,
                requiredCompletion: 100
            });
        }

        next();
    } catch (error) {
        // Explicitly mask database connection errors early
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('prisma') || message.toLowerCase().includes('neon')) {
            return next(new AppError('Database connection issue. Please try again later.', 503));
        }
        next(error);
    }
}
