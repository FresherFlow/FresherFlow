import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { OrganizationService } from '../infrastructure/services/organization.service';
import { AppError } from '../middleware/errorHandler';
import prisma from '../infrastructure/database/prisma';

const router = Router();

/**
 * POST /api/organizations
 * Create or auto-join an Organization based on user email domain
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { orgName, type, website } = req.body;

        if (!orgName || typeof orgName !== 'string') {
            return next(new AppError('Organization name is required', 400));
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user || !user.email) {
            return next(new AppError('User email required for organization signup', 400));
        }

        const result = await OrganizationService.createOrJoinOrganization({
            userId,
            userEmail: user.email,
            orgName,
            type,
            website
        });

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/:id
 * Get organization profile details and members
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const organization = await OrganizationService.getOrganization(id);

        if (!organization) {
            return next(new AppError('Organization not found', 404));
        }

        return res.json({
            success: true,
            data: organization
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/organizations/:id/invite
 * Invite a team member to an organization
 */
router.post('/:id/invite', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const { email, role } = req.body;
        const userId = req.userId!;

        if (!email || typeof email !== 'string') {
            return next(new AppError('Recipient email is required', 400));
        }

        const invite = await OrganizationService.inviteTeamMember({
            organizationId: id,
            invitedByUserId: userId,
            email,
            role
        });

        return res.status(201).json({
            success: true,
            data: invite
        });
    } catch (error) {
        next(error);
    }
});

export default router;
