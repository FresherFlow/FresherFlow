import express, { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../../infrastructure/services/organization/company.service';
import { AppError } from '../../middleware/errorHandler';
import { createRateLimiter } from '../../middleware/rateLimit';

const router = express.Router();

// Directory reads are cheap per request but trivially scriptable, so they get
// their own cap on top of the global limiter.
const publicCompanyReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many company requests. Please slow down.',
    keyPrefix: 'public-company-read',
});

/**
 * GET /api/public/companies/search
 * Search for companies by name
 */
router.get('/search', publicCompanyReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q : undefined;
        const companies = await CompanyService.listCompanies(q);
        res.json({ companies });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/companies/:name
 * Get detailed company profile
 */
router.get('/:name', publicCompanyReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.params;
        if (typeof name !== 'string') return next(new AppError('Invalid company name', 400));
        const profile = await CompanyService.getCompanyProfile(name);

        if (!profile) {
            return next(new AppError('Company not found', 404));
        }

        res.json({ company: profile });
    } catch (error) {
        next(error);
    }
});

export default router;
