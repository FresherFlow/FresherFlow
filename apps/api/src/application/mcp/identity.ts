import prisma from '../../infrastructure/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { getUserPermissions } from '../../middleware/auth';

/**
 * Who is on the other end of an MCP connection, expressed in the only two roles
 * this surface has.
 *
 * The MCP surface is not the admin panel: a moderator reaches it with an OAuth
 * token minted for a normal login, not with an admin session. So "moderator"
 * here means exactly "this account holds the moderator RBAC grants", resolved
 * from the same `Permission <- AccessRolePermission <- UserAccessRole` join the
 * web app uses. There is no second permission system to drift out of sync.
 *
 * The one product rule this encodes:
 *
 *   A moderator's submission goes live. Everyone else's is a draft.
 *
 * Every caller — the submit route, `whoami`, the tool registration in
 * `apps/mcp` — reads that decision from here, so the rule cannot be stated one
 * way in the API and another way in the tool descriptions.
 */

export type McpRole = 'moderator' | 'user';

export interface McpCapabilities {
    /** Always true: an authenticated connection may submit. */
    submitPublishes: boolean;
    canModerate: boolean;
    canPublish: boolean;
    canWriteListings: boolean;
}

export interface McpIdentityView {
    userId: string;
    role: McpRole;
    permissions: string[];
    capabilities: McpCapabilities;
}

/**
 * The permission keys this surface cares about. Kept as constants so a typo in
 * one route cannot silently grant a capability that another route denies.
 */
const PERMISSION = {
    review: 'opportunity.review',
    publish: 'opportunity.publish',
    create: 'opportunity.create',
    edit: 'opportunity.edit',
} as const;

/** Pure projection of an RBAC grant list onto the MCP capability set. */
export function capabilitiesFromPermissions(permissions: readonly string[]): McpCapabilities {
    const has = (key: string) => permissions.includes(key);
    const canReview = has(PERMISSION.review);
    const canPublish = has(PERMISSION.publish);
    return {
        // Publishing a submission is the moderator privilege. It is read from
        // `opportunity.publish` rather than from a role label, so revoking the
        // grant in the admin panel takes effect on the next call.
        submitPublishes: canPublish,
        canModerate: canReview && canPublish,
        canPublish,
        // Full listing writes need either key: moderators hold `edit`, a super
        // admin holds both. A plain account holds neither.
        canWriteListings: has(PERMISSION.create) || has(PERMISSION.edit),
    };
}

/** The MCP role label. Publish or review makes an account staff on this surface. */
export function roleFromPermissions(permissions: readonly string[]): McpRole {
    return permissions.includes(PERMISSION.review) || permissions.includes(PERMISSION.publish)
        ? 'moderator'
        : 'user';
}

/**
 * Resolve a signed-in user into the MCP identity view.
 *
 * A missing or non-active account is rejected here rather than deeper in a
 * handler: an OAuth token outlives a suspension, and a suspended moderator must
 * not keep publishing through a chat client because their token still verifies.
 */
export async function resolveMcpIdentity(userId: string): Promise<McpIdentityView> {
    const [user, permissions] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true },
        }),
        getUserPermissions(userId),
    ]);

    if (!user) throw new AppError('User not found', 404);
    if (user.status !== 'ACTIVE') {
        throw new AppError('This FresherFlow account is not active, so it cannot use FresherFlow tools.', 403);
    }

    return {
        userId: user.id,
        role: roleFromPermissions(permissions),
        permissions,
        capabilities: capabilitiesFromPermissions(permissions),
    };
}

/** Convenience for routes that only need the publish decision. */
export async function canPublishForUser(userId: string): Promise<boolean> {
    return (await getUserPermissions(userId)).includes(PERMISSION.publish);
}
