import type { ModeratorSession } from '@/lib/auth/AdminContext';
import { MODERATION_PERMISSIONS } from '@/features/moderation/moderationAuth';

/**
 * Permissions to filter navigation with: `null` means full admin nav,
 * an array means moderator nav showing only rows whose `permission` is
 * included.
 *
 * Split of duties with the dedicated `/moderator` area (own layout, gate,
 * nav, hub): community queues live THERE. Inside `/admin`, moderators keep
 * only Listings review, which has no `/moderator` home — mirroring the API
 * gates (`requirePermission`) so the nav never offers a page whose
 * endpoints would 403:
 *
 * - Listings review/export        → `opportunity.review`
 * - New listing                   → `opportunity.create`
 * - Everything else in /admin     → admin only
 *
 * Route matching is longest-prefix-first so
 * `/admin/opportunities/create` (create) wins over `/admin/opportunities`
 * (review), and bare `/admin` redirects to the landing page.
 */
export function navPermissions(
    admin: unknown,
    moderator: ModeratorSession | null,
): string[] | null {
    return !admin && moderator ? moderator.permissions : null;
}

export type AdminRouteRequirement =
    | { kind: 'public' }
    | { kind: 'staff'; permission?: string }
    | { kind: 'admin' };

const ROUTE_REQUIREMENTS: Array<{ prefix: string; requirement: AdminRouteRequirement }> = [
    { prefix: '/admin/login', requirement: { kind: 'public' } },
    { prefix: '/admin/opportunities/create', requirement: { kind: 'staff', permission: 'opportunity.create' } },
    { prefix: '/admin/opportunities/edit', requirement: { kind: 'staff', permission: 'opportunity.edit' } },
    { prefix: '/admin/opportunities', requirement: { kind: 'staff', permission: 'opportunity.review' } },
    { prefix: '/admin', requirement: { kind: 'admin' } },
];

export function getAdminRouteRequirement(pathname: string): AdminRouteRequirement {
    const match = ROUTE_REQUIREMENTS.filter(({ prefix }) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`),
    ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
    return match?.requirement ?? { kind: 'admin' };
}

export function canAccessAdminRoute(
    pathname: string,
    access: { isAdmin: boolean; permissions: string[] },
): boolean {
    const requirement = getAdminRouteRequirement(pathname);
    if (requirement.kind === 'public') return true;
    if (access.isAdmin) return true;
    if (requirement.kind === 'admin') return false;
    if (!requirement.permission) return access.permissions.length > 0;
    return access.permissions.includes(requirement.permission);
}

/**
 * Moderator landing: the dedicated `/moderator` hub whenever the grant
 * carries any queue permission (same set its gate checks). Otherwise ''
 * (revoked or bare grant → 403 page, not a guess). Listings-only holders
 * still land in the hub — it links every queue including Listings review.
 */
export function getModeratorLanding(permissions: string[]): string {
    const hasQueue = (MODERATION_PERMISSIONS as readonly string[]).some((key) =>
        permissions.includes(key),
    );
    return hasQueue ? '/moderator' : '';
}
