import type { ModeratorSession } from '@/lib/auth/AdminContext';

/**
 * Permissions to filter navigation with: `null` means full admin nav,
 * an array means moderator nav showing only rows whose `permission` is
 * included. Moderators with a bare grant (no keys) see an empty rail —
 * the route guard below turns that into a 403 with an exit, not a guess.
 *
 * Admin sessions pass everything. Moderator sessions (user accounts holding
 * access-role grants) see only the queues their permission keys unlock —
 * mirroring the API gates (`requirePermission`) so the nav never offers a
 * page whose endpoints would 403:
 *
 * - Listings review/export        → `opportunity.review`
 * - New listing                   → `opportunity.create`
 * - Community submissions         → `community.moderate`
 * - Reports                       → `report.resolve`
 * - Everything else               → admin only
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
    { prefix: '/admin/community-submissions', requirement: { kind: 'staff', permission: 'community.moderate' } },
    { prefix: '/admin/reports', requirement: { kind: 'staff', permission: 'report.resolve' } },
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

const MODERATOR_LANDING_ORDER: Array<{ permission: string; href: string }> = [
    { permission: 'community.moderate', href: '/admin/community-submissions' },
    { permission: 'report.resolve', href: '/admin/reports' },
    { permission: 'opportunity.review', href: '/admin/opportunities' },
];

/**
 * First queue the moderator may open, or '' when their grant carries none
 * of the queue permissions (revoked or bare grant → 403 page, not a guess).
 */
export function getModeratorLanding(permissions: string[]): string {
    return MODERATOR_LANDING_ORDER.find(({ permission }) => permissions.includes(permission))?.href ?? '';
}
