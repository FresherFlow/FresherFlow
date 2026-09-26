import prisma from '../database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { MembershipStatus, OrgRole } from '@fresherflow/database';

/**
 * Organization access gate shared by the organization-scoped routers.
 *
 * WHY a single denial message: distinguishing "no such organization" from "you
 * are not a member" would turn a 403 into an oracle for which organization ids
 * exist. Every failure is therefore the same 403 with the same text; callers
 * that legitimately need a 404 (a resource that is not in the caller's org)
 * check ownership themselves and return 404, which reveals nothing extra.
 */
export const DENIED = 'Not an active member of this organization';

/**
 * Role ordering for the minRole check. Kept as a table rather than an enum
 * comparison so the ordering is stated in one place and stays readable.
 */
const ROLE_RANK: Record<OrgRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    RECRUITER: 2,
    VIEWER: 1,
};

export interface OrgAccess {
    organizationId: string;
    userId: string;
    role: OrgRole;
    status: MembershipStatus;
}

/**
 * Proves the caller is an APPROVED member of the organization at
 * `minRole` or above.
 *
 * The default is RECRUITER on purpose: writes get the strict default for free
 * and only genuine readers have to opt down to VIEWER, so forgetting the option
 * on a new route fails closed instead of leaking another tenant's data.
 *
 * `userId` always comes from the verified access token. It is never read from a
 * request body, a query string, or any other caller-supplied value.
 */
export async function requireOrgMembership(
    userId: string,
    organizationId: string,
    opts: { minRole?: OrgRole } = {}
): Promise<OrgAccess> {
    const minRole = opts.minRole ?? OrgRole.RECRUITER;

    const membership = await prisma.organizationMembership.findFirst({
        where: { userId, organizationId },
        select: { organizationId: true, userId: true, role: true, status: true },
    });

    // A PENDING or REJECTED invite is not membership, and a row that does not
    // exist is not evidence of anything. Both are the same denial to the caller.
    if (!membership || membership.status !== MembershipStatus.APPROVED) {
        throw new AppError(DENIED, 403);
    }

    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
        throw new AppError(DENIED, 403);
    }

    return membership;
}

/**
 * Every organization the user is an approved member of. Used by candidate-facing
 * reads that have to show several tenants' data at once, so it returns only
 * APPROVED memberships.
 */
export async function getUserOrgIds(userId: string): Promise<string[]> {
    const memberships = await prisma.organizationMembership.findMany({
        where: { userId, status: MembershipStatus.APPROVED },
        select: { organizationId: true },
    });

    return memberships.map((m) => m.organizationId);
}

/**
 * Boolean form of requireOrgMembership for call sites that branch on access
 * instead of failing. Never lets a database error become a false "allowed" —
 * an unexpected error is swallowed and reported as no access.
 */
export async function hasOrgAccess(
    userId: string,
    organizationId: string,
    opts: { minRole?: OrgRole } = {}
): Promise<boolean> {
    try {
        await requireOrgMembership(userId, organizationId, opts);
        return true;
    } catch {
        return false;
    }
}
