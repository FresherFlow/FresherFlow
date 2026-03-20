import express, { Request, Response, NextFunction } from 'express';
import { getCompanyProfile, listCompanies } from '../../application/company/queries';
import { AppError } from '../../middleware/errorHandler';

const router = express.Router();

/**
 * GET /api/public/companies/search
 * Search for companies by name
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q : undefined;
        const companies = await listCompanies(q);
        res.json({ companies });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/companies/:name
 * Get detailed company profile
 */
router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.params;
        if (typeof name !== 'string') return next(new AppError('Invalid company name', 400));
        const profile = await getCompanyProfile(name);

        if (!profile) {
            return next(new AppError('Company not found', 404));
        }

        res.json({ company: profile });
    } catch (error) {
        next(error);
    }
});

export default router;
