import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import {
    savedSearchCreateSchema,
    savedSearchUpdateSchema,
    referralRequestCreateSchema,
    referralResponseCreateSchema,
    referralRequestStatusSchema,
    salaryReportCreateSchema,
} from '../utils/validation';
import * as fresherNeeds from '../infrastructure/services/fresherNeeds.service';
import { ReferralRequestStatus } from '@fresherflow/database';

const router = Router();

const parsePositiveInt = (value: unknown, fallback: number, max: number): number => {
    const n = typeof value === 'string' ? parseInt(value, 10) : NaN;
    if (Number.isNaN(n) || n < 1) return fallback;
    return Math.min(n, max);
};

const paramString = (value: string | string[] | undefined): string =>
    typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : '';

// ============================================================================
// WALK-INS TODAY
// ============================================================================

router.get('/walk-ins-today', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const batchRaw = typeof req.query.batch === 'string' ? parseInt(req.query.batch, 10) : NaN;
        const result = await fresherNeeds.listWalkInsToday({
            city: typeof req.query.city === 'string' ? req.query.city.slice(0, 80) : undefined,
            batch: Number.isNaN(batchRaw) ? undefined : batchRaw,
            limit: parsePositiveInt(req.query.limit, 100, 200),
        });
        res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// SAVED SEARCHES
// ============================================================================

router.get('/saved-searches', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const searches = await fresherNeeds.listSavedSearches(req.userId as string);
        res.json({ searches });
    } catch (err) {
        next(err);
    }
});

router.post('/saved-searches', requireAuth, validate(savedSearchCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = await fresherNeeds.createSavedSearch(req.userId as string, {
            name: req.body.name,
            filters: req.body.filters,
            alertEnabled: req.body.alertEnabled,
        });
        res.status(201).json({ search });
    } catch (err) {
        next(err);
    }
});

router.patch('/saved-searches/:id', requireAuth, validate(savedSearchUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = await fresherNeeds.updateSavedSearch(req.userId as string, paramString(req.params.id), {
            name: req.body.name,
            alertEnabled: req.body.alertEnabled,
        });
        res.json({ search });
    } catch (err) {
        next(err);
    }
});

router.delete('/saved-searches/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await fresherNeeds.deleteSavedSearch(req.userId as string, paramString(req.params.id));
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// REFERRAL REQUEST BOARD
// ============================================================================

router.get('/referral-requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await fresherNeeds.listReferralRequests({
            page: parsePositiveInt(req.query.page, 1, 100),
            limit: parsePositiveInt(req.query.limit, 20, 50),
            company: typeof req.query.company === 'string' ? req.query.company.slice(0, 120) : undefined,
            status: typeof req.query.status === 'string' && ['OPEN', 'FULFILLED', 'CLOSED'].includes(req.query.status)
                ? (req.query.status as ReferralRequestStatus)
                : undefined,
            currentUserId: req.userId,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/referral-requests', requireAuth, validate(referralRequestCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = await fresherNeeds.createReferralRequest(req.userId as string, {
            company: req.body.company,
            role: req.body.role,
            batch: req.body.batch,
            city: req.body.city,
            note: req.body.note,
        });
        res.status(201).json({ request });
    } catch (err) {
        next(err);
    }
});

router.patch('/referral-requests/:id/status', requireAuth, validate(referralRequestStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = await fresherNeeds.closeReferralRequest(
            req.userId as string,
            paramString(req.params.id),
            req.body.status as ReferralRequestStatus
        );
        res.json({ request });
    } catch (err) {
        next(err);
    }
});

router.post('/referral-requests/:id/respond', requireAuth, validate(referralResponseCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response = await fresherNeeds.respondToReferralRequest(req.userId as string, paramString(req.params.id), {
            message: req.body.message,
            contactHandle: req.body.contactHandle,
        });
        res.status(201).json({ response });
    } catch (err) {
        next(err);
    }
});

router.delete('/referral-requests/:id/respond', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await fresherNeeds.deleteReferralResponse(req.userId as string, paramString(req.params.id));
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// SALARY REPORTS
// ============================================================================

router.get('/salary-reports', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const batchRaw = typeof req.query.batch === 'string' ? parseInt(req.query.batch, 10) : NaN;
        const result = await fresherNeeds.listSalaryReports({
            page: parsePositiveInt(req.query.page, 1, 100),
            limit: parsePositiveInt(req.query.limit, 20, 50),
            company: typeof req.query.company === 'string' ? req.query.company.slice(0, 120) : undefined,
            role: typeof req.query.role === 'string' ? req.query.role.slice(0, 120) : undefined,
            city: typeof req.query.city === 'string' ? req.query.city.slice(0, 80) : undefined,
            batch: Number.isNaN(batchRaw) ? undefined : batchRaw,
            currentUserId: req.userId,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/salary-reports', requireAuth, validate(salaryReportCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const report = await fresherNeeds.createSalaryReport(req.userId as string, {
            opportunityId: req.body.opportunityId,
            company: req.body.company,
            role: req.body.role,
            batch: req.body.batch,
            city: req.body.city,
            reportType: req.body.reportType,
            ctcFixed: req.body.ctcFixed,
            ctcVariable: req.body.ctcVariable,
            ctcTotal: req.body.ctcTotal,
            inHandMonthly: req.body.inHandMonthly,
            joinBonus: req.body.joinBonus,
            bondMonths: req.body.bondMonths,
            notes: req.body.notes,
        });
        res.status(201).json({ report });
    } catch (err) {
        next(err);
    }
});

router.post('/salary-reports/:id/helpful', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await fresherNeeds.markSalaryReportHelpful(req.userId as string, paramString(req.params.id));
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// COMPANY HUB
// ============================================================================

router.get('/companies/:name/hub', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hub = await fresherNeeds.getCompanyHub(paramString(req.params.name));
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.json(hub);
    } catch (err) {
        next(err);
    }
});

export default router;
