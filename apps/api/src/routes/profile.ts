import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { educationSchema, preferencesSchema, readinessSchema, contributionSchema } from '../utils/validation';
import { ProfileService } from '../infrastructure/services/profile.service';
import { AppError } from '../middleware/errorHandler';

const router: Router = express.Router();

// GET /api/profile
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const profile = await ProfileService.getProfile(req.userId as string);
        res.json({ profile });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile - Comprehensive update
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { profile, newCompletion } = await ProfileService.updateProfile(req.userId as string, req.body);
        res.json({
            profile,
            message: `Profile synchronized. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/education
router.put('/education', requireAuth, validate(educationSchema.extend({ fullName: z.string().min(1, 'Full name is required').optional() })), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { profile, newCompletion } = await ProfileService.updateEducation(req.userId as string, req.body);
        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/preferences
router.put('/preferences', requireAuth, validate(preferencesSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { profile, newCompletion } = await ProfileService.updatePreferences(req.userId as string, req.body);
        res.json({
            profile,
            message: `Profile updated. Completion: ${newCompletion}%`
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/profile/readiness
router.put('/readiness', requireAuth, validate(readinessSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { profile, newCompletion } = await ProfileService.updateReadiness(req.userId as string, req.body);
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
        const completion = await ProfileService.getCompletion(req.userId as string);
        res.json(completion);
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/push-token
router.post('/push-token', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, platform } = req.body;
        if (!token) {
            return next(new AppError('Push token is required', 400));
        }

        await ProfileService.registerPushToken(req.userId as string, token, platform, req.headers['user-agent']);
        res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
        next(error);
    }
});

// GET /api/profile/shares
router.get('/shares', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 20;
        const result = await ProfileService.getShares(req.userId as string, page, limit);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/shares
router.post('/shares', requireAuth, validate(contributionSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const share = await ProfileService.createShare(req.userId as string, req.body);
        res.status(201).json({
            success: true,
            message: 'Share received! Our team will review and publish it soon.',
            share
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/profile/username/check
router.get('/username/check', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = (req.query.username as string)?.toLowerCase();
        const available = await ProfileService.checkUsername(username);
        res.json({
            available,
            reason: (!username || username.length < 3) ? 'Too short' : undefined
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/profile/username/claim
router.post('/username/claim', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.body;
        const cooldownDays = Number(process.env.USERNAME_COOLDOWN_DAYS || 30);
        const claimed = await ProfileService.claimUsername(req.userId as string, username, cooldownDays);
        res.json({
            success: true,
            username: claimed,
            message: 'Username claimed successfully'
        });
    } catch (error) {
        next(error);
    }
});

// Backward-compatible aliases
router.get('/contributions', requireAuth, (req, res, _next) => {
    res.redirect(301, '/api/profile/shares');
});

export default router;
