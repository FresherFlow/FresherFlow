import { adminApi } from '@/lib/api/admin';

/**
 * TODO(spec): `packages/api-client/src/admin/moderation.ts` does not exist yet.
 * The task contract names (`listModerators`, `grantModerator`, `revokeModerator`,
 * `suspendUser`, `reactivateUser`, `auditLog`) are exposed here as a web-local
 * adapter over the existing typed wrappers in `@/lib/api/admin`
 * (GET/POST/DELETE `/api/admin/moderators`, POST `/api/admin/users/:id/status`,
 * GET `/api/admin/audit`). When the parallel API agent lands `moderation.ts`,
 * re-point these delegates and delete this shim. Do NOT create API files from here.
 */

export interface ModeratorListEntry {
    id: string;
    email: string | null;
    username: string | null;
    fullName: string | null;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
    assignedAt: string;
}

export interface DirectoryUser {
    id: string;
    email?: string;
    username?: string;
    fullName?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
    createdAt?: string;
}

export type ModeratorStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

/** Spec §1: list with status + assigned-at. */
export async function listModerators(): Promise<ModeratorListEntry[]> {
    const res = (await adminApi.getModerators()) as { moderators: ModeratorListEntry[] };
    return res.moderators ?? [];
}

/** Spec §1: grant to an existing user. Idempotent guard: 409 = already a moderator. */
export async function grantModerator(userId: string, reason?: string): Promise<void> {
    await adminApi.grantModerator(userId, reason);
}

/** Spec §3: remove moderator access; the underlying account stays active. */
export async function revokeModerator(userId: string): Promise<ModeratorStatus | undefined> {
    const res = (await adminApi.revokeModerator(userId)) as { user?: { status?: ModeratorStatus } };
    return res?.user?.status;
}

/** Spec §3/§7: suspend the underlying user with an audit reason. */
export async function suspendUser(userId: string, reason?: string): Promise<ModeratorStatus> {
    const res = (await adminApi.setUserStatus(userId, 'SUSPENDED', reason ?? 'Suspended by admin')) as {
        user: { status: ModeratorStatus };
    };
    return res.user.status;
}

/** Spec §3/§7: reactivate the underlying user. */
export async function reactivateUser(userId: string): Promise<ModeratorStatus> {
    const res = (await adminApi.setUserStatus(userId, 'ACTIVE', 'Reactivated by admin')) as {
        user: { status: ModeratorStatus };
    };
    return res.user.status;
}

export interface ModeratorAuditRecord {
    /** Who performed the action (actor display name or id). */
    who: string;
    action: string;
    /** What object the action targeted. */
    object: string;
    /** When the action happened (ISO timestamp). */
    at: string;
    reason: string | null;
    /**
     * TODO(spec): the audit API (`GET /api/admin/audit`) returns no `result`
     * field — every audited write is a success by construction. This always
     * resolves to '—' until the API slice adds one.
     */
    result: string;
}

interface RawAuditEntry {
    id: string;
    action: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
    user: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
}

/** Spec §3/§8: moderator actions in the audit log, newest first. */
export async function auditLog(params?: {
    actorId?: string;
    action?: string;
    targetId?: string;
    limit?: number;
}): Promise<ModeratorAuditRecord[]> {
    const res = (await adminApi.getAuditLog({ ...params, limit: params?.limit ?? 100 })) as {
        entries: RawAuditEntry[];
    };
    return (res.entries ?? []).map((entry) => ({
        who: entry.user?.username
            ? `@${entry.user.username}`
            : (entry.user?.fullName ?? entry.user?.email ?? entry.user?.id ?? '—'),
        action: entry.action,
        object: entry.targetId,
        at: entry.createdAt,
        reason: entry.reason,
        result: '—',
    }));
}

/** Spec §1: directory of existing users eligible for a grant. */
export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
    const res = (await adminApi.getUsers()) as { users: DirectoryUser[] };
    return res.users ?? [];
}
