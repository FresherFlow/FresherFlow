import prisma from '../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { educationSchema, preferencesSchema, readinessSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { calculateCompletion } from '../utils/profileCompletion';
import {
    normalizeCourseName,
    normalizeSpecializationName
} from '../utils/academicNormalization';

const router: Router = express.Router();


// GET /api/profile
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await prisma.profile.findUnique({
            where: { userId: req.userId }
        });

        if (!profile) {
            return next(new AppError('Profile not found', 404));
        }

        res.json({ profile });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile - Comprehensive update
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fullName, ...data } = req.body;
        const normalizedGradCourse = normalizeCourseName(data.gradCourse);
        const normalizedGradSpecialization = normalizeSpecializationName(data.gradSpecialization);
        const normalizedPgCourse = normalizeCourseName(data.pgCourse) || null;
        const normalizedPgSpecialization = normalizeSpecializationName(data.pgSpecialization) || null;

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: req.userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                educationLevel: data.educationLevel,
                tenthYear: data.tenthYear,
                twelfthYear: data.twelfthYear,
                gradCourse: normalizedGradCourse,
                gradSpecialization: normalizedGradSpecialization,
                gradYear: data.gradYear,
                pgCourse: normalizedPgCourse,
                pgSpecialization: normalizedPgSpecialization,
                pgYear: data.pgYear,
                interestedIn: data.interestedIn,
                preferredCities: data.preferredCities,
                workModes: data.workModes,
                availability: data.availability,
                skills: data.skills
            }
        });

        // Recalculate completion percentage
        const newCompletion = calculateCompletion(profile as any);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile synchronized. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/education (40% weight)
router.put('/education', requireAuth, validate(educationSchema.extend({ fullName: z.string().min(1, 'Full name is required').optional() })), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            fullName,
            educationLevel,
            tenthYear,
            twelfthYear,
            gradCourse, gradSpecialization, gradYear,
            pgCourse, pgSpecialization, pgYear
        } = req.body;
        const normalizedGradCourse = normalizeCourseName(gradCourse);
        const normalizedGradSpecialization = normalizeSpecializationName(gradSpecialization);
        const normalizedPgCourse = normalizeCourseName(pgCourse) || null;
        const normalizedPgSpecialization = normalizeSpecializationName(pgSpecialization) || null;

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: req.userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                educationLevel,
                tenthYear,
                twelfthYear,
                gradCourse: normalizedGradCourse,
                gradSpecialization: normalizedGradSpecialization,
                gradYear,
                pgCourse: normalizedPgCourse,
                pgSpecialization: normalizedPgSpecialization,
                pgYear
            }
        });

        // Recalculate completion percentage (DERIVED FIELD)
        const newCompletion = calculateCompletion(profile as any);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/preferences (40% weight)
router.put('/preferences', requireAuth, validate(preferencesSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { interestedIn, preferredCities, workModes } = req.body;

        // Validate max 5 cities
        if (preferredCities.length > 5) {
            return next(new AppError('Maximum 5 cities allowed', 400));
        }

        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                interestedIn,
                preferredCities,
                workModes
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion(profile as any);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/readiness (20% weight)
router.put('/readiness', requireAuth, validate(readinessSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { availability, skills } = req.body;

        let profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: {
                availability,
                skills
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion(profile as any);
        profile = await prisma.profile.update({
            where: { userId: req.userId },
            data: { completionPercentage: newCompletion }
        });

        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/profile/completion
router.get('/completion', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await prisma.profile.findUnique({
            where: { userId: req.userId }
        });

        if (!profile) {
            return next(new AppError('Profile not found', 404));
        }

        res.json({
            completionPercentage: profile.completionPercentage,
            isComplete: profile.completionPercentage === 100
        });
    } catch (error) {
        next(error);
    }
});

export default router;

