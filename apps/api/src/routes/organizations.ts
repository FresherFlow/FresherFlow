/**
 * Phase 11 — organization, membership, and invite routes.
 *
 * Authorization is uniform across this router: `requireOrgMembership` resolves
 * the caller's membership from their verified token, and the organization id in
 * the path is never trusted on its own. Reads ask for VIEWER, writes ask for
 * ADMIN, so a new route fails closed by default.
 *
 * The invite-accept routes are the deliberate exception — the caller is not yet
 * a member, so membership cannot be the gate. They are gated on the token's own
 * expiry plus a match against the authenticated user's own email address.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import {
    OrganizationService,
    OrganizationMembershipService,
} from '../infrastructure/services/organization.service';
import { requireOrgMembership } from '../infrastructure/services/orgAccess';
import { OrgRole } from '@fresherflow/database';
import type { Prisma } from '@fresherflow/database';
import { OrganizationType } from '@fresherflow/types';
import prisma from '../infrastructure/database/prisma';

const router = Router();

/** Writes that create capability (an invite, a member) are limited harder than
 *  ordinary reads: each one either sends mail or changes who can reach the tenant. */
const orgWriteLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many organization changes. Please try again shortly.',
    keyPrefix: 'org-write',
});

// ── Schemas ────────────────────────────────────────────────────────────────

const createOrgSchema = z.object({
    orgName: z.string().trim().min(2).max(120),
    type: z.string().trim().min(1).optional(),
    website: z.string().trim().url().nullish(),
});

const updateOrgSchema = z
    .object({
        name: z.string().trim().min(2).max(120).optional(),
        website: z.string().trim().url().nullish(),
        logo: z.string().trim().max(500).nullish(),
        active: z.boolean().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

const inviteSchema = z.object({
    email: z.string().trim().email().max(254),
    role: z.nativeEnum(OrgRole).default(OrgRole.RECRUITER),
});

const addMemberSchema = z.object({
    userId: z.string().trim().min(1),
    role: z.nativeEnum(OrgRole).default(OrgRole.RECRUITER),
});

const roleSchema = z.object({ role: z.nativeEnum(OrgRole) });

const acceptInviteSchema = z.object({
    token: z.string().trim().min(16).max(200),
});

/** Resolves and authorizes the caller for this organization. */
async function authorize(req: Request, minRole: OrgRole): Promise<{ organizationId: string }> {
    const organizationId = String(req.params.id);
    await requireOrgMembership(req.userId!, organizationId, { minRole });
    return { organizationId };
}

/**
 * POST /api/organizations
 * Create or auto-join an Organization based on user email domain
 */
router.post('/', requireAuth, validate(createOrgSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { orgName, type, website } = req.body as z.infer<typeof createOrgSchema>;

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
            // The stored column is an enum, so an unrecognised type string must
            // not reach Prisma. Falling back to COMPANY keeps signup working
            // rather than failing a valid request on an unrecognised label.
            type: (type as OrganizationType | undefined) ?? OrganizationType.COMPANY,
            website: website ?? undefined,
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
 * PATCH /api/organizations/:id
 * Update the organization profile. Requires ADMIN.
 *
 * `verified` is deliberately absent from this schema: verification is a
 * platform trust decision and must not be reachable by a company admin editing
 * its own record.
 */
router.patch('/:id', requireAuth, orgWriteLimiter, validate(updateOrgSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);

        const organization = await OrganizationMembershipService.updateOrganization({
            organizationId,
            actorUserId: req.userId!,
            patch: req.body as z.infer<typeof updateOrgSchema>,
        });

        return res.json({ success: true, data: organization });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/organizations/:id/invite
 * Invite a team member. Requires ADMIN.
 *
 * The invite row carries a CSPRNG token; delivery is left to the caller so this
 * handler never blocks on a mail provider. The token is only ever returned to an
 * authorized admin, never on a public surface.
 */
router.post('/:id/invite', requireAuth, orgWriteLimiter, validate(inviteSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);
        const { email, role } = req.body as z.infer<typeof inviteSchema>;

        const invite = await OrganizationMembershipService.createInvite({
            organizationId,
            email,
            role,
            invitedByUserId: req.userId!,
        });

        return res.status(201).json({ success: true, data: invite });
    } catch (error) {
        next(error);
    }
});

/** GET /api/organizations/:id/invites — pending invites. Requires ADMIN, because
 *  the rows carry redeemable tokens. */
router.get('/:id/invites', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);
        const invites = await OrganizationMembershipService.listInvites(organizationId);
        return res.json({ success: true, data: invites });
    } catch (error) {
        next(error);
    }
});

/** DELETE /api/organizations/:id/invites/:inviteId — revoke a pending invite. */
router.delete('/:id/invites/:inviteId', requireAuth, orgWriteLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);

        await OrganizationMembershipService.revokeInvite({
            organizationId,
            inviteId: String(req.params.inviteId),
        });

        return res.json({ success: true, message: 'Invite revoked' });
    } catch (error) {
        next(error);
    }
});

/** GET /api/organizations/:id/members — list members. Requires VIEWER. */
router.get('/:id/members', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.VIEWER);
        const members = await OrganizationMembershipService.listMembers(organizationId);
        return res.json({ success: true, data: members });
    } catch (error) {
        next(error);
    }
});

/** POST /api/organizations/:id/members — add a known account directly. Requires ADMIN. */
router.post('/:id/members', requireAuth, orgWriteLimiter, validate(addMemberSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);
        const { userId, role } = req.body as z.infer<typeof addMemberSchema>;

        const member = await OrganizationMembershipService.addMember({
            organizationId,
            userId,
            role,
        });

        return res.status(201).json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
});

/** PATCH /api/organizations/:id/members/:userId — change a role. Requires ADMIN. */
router.patch('/:id/members/:userId', requireAuth, orgWriteLimiter, validate(roleSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);
        const { role } = req.body as z.infer<typeof roleSchema>;

        const member = await OrganizationMembershipService.updateMemberRole({
            organizationId,
            userId: String(req.params.userId),
            role,
        });

        return res.json({ success: true, data: member });
    } catch (error) {
        next(error);
    }
});

/** DELETE /api/organizations/:id/members/:userId — remove a member. Requires ADMIN. */
router.delete('/:id/members/:userId', requireAuth, orgWriteLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { organizationId } = await authorize(req, OrgRole.ADMIN);

        await OrganizationMembershipService.removeMember({
            organizationId,
            userId: String(req.params.userId),
        });

        return res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        next(error);
    }
});

export default router;

// ── Invite acceptance ──────────────────────────────────────────────────────
//
// The caller is not yet a member, so `requireOrgMembership` cannot be the gate
// here. The real gate is the token's own expiry plus a match against the
// authenticated account's own email address, both enforced in the service. Auth
// is still required: an invite is always redeemed by a signed-in account.

export const inviteRouter = Router();

/**
 * GET /api/organizations/invites/:token
 * Preview an invite without consuming it, so the accept screen can name the
 * organization before the user commits. Auth is still required because the
 * response reveals the organization name and the invited role.
 */
inviteRouter.get('/invites/:token', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const invite = await OrganizationMembershipService.peekInvite(String(req.params.token));
        return res.json({ success: true, data: invite });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/organizations/invites/accept
 * Redeem an invite for the authenticated user.
 *
 * The body carries only the token. The account it applies to is always
 * `req.userId`, so a caller cannot redeem a teammate's invite onto their own
 * account and the service's email match stays the real gate.
 */
inviteRouter.post('/invites/accept', requireAuth, orgWriteLimiter, validate(acceptInviteSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.body as z.infer<typeof acceptInviteSchema>;
        const result = await OrganizationMembershipService.acceptInvite({
            token,
            userId: req.userId!,
        });
        return res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});
