import { apiClient } from './apiClient';
import type { ModeratorEntry } from './moderators';
import type { AuditEntry } from './audit';
import type { AdminReport, AdminReportStatus } from './reports';

/**
 * V1 Moderator backend contract (checklist sections 1, 3, 4, 7, 8).
 *
 * Single home for the ten moderator actions the admin/moderator UI builds
 * against. Every function below delegates to an existing backend endpoint —
 * no new HTTP surface was added for them (reuse rule):
 *
 * | function                | method + path                                        |
 * |-------------------------|------------------------------------------------------|
 * | listModerators          | GET /api/admin/moderators                            |
 * | grantModerator          | POST /api/admin/moderators/:userId                   |
 * | revokeModerator         | DELETE /api/admin/moderators/:userId                 |
 * | suspendUser/reactivate  | POST /api/admin/users/:userId/status                 |
 * | listQueue               | GET per queue (see ModerationQueue mapping)          |
 * | reviewItem              | per-queue mutation (see QueueReviewAction mapping)   |
 * | listReports/resolve     | GET /api/admin/reports, POST /:id/resolve|/dismiss   |
 * | auditLog                | GET /api/admin/audit                                 |
 *
 * Auth: grant/revoke/audit are admin-only (moderator.manage / audit.view —
 * moderators get 403). Queues and reviews accept moderators via the normal
 * login (requireStaff + per-action permission). Suspended accounts get 403
 * on every protected route.
 */

export type ModerationQueue = 'jobs' | 'interviews' | 'updates' | 'hiring-posts' | 'resources' | 'reports';

export type QueueReviewAction =
    | 'approve'
    | 'reject'
    | 'remove'
    | 'spam'
    | 'restore'
    | 'resolve'
    | 'dismiss';

export type ReportResolutionAction = 'resolve' | 'dismiss';

export interface ModerationQueueResult {
    items: unknown[];
    total: number;
    page?: number;
    limit?: number;
}

export interface AuditLogParams {
    actorId?: string;
    action?: string;
    targetId?: string;
    page?: number;
    limit?: number;
}

export interface ModerationOverview {
    jobs: number;
    interviews: number;
    updates: number;
    hiringPosts: number;
    resources: number;
    reports: number;
}

function enc(value: string): string {
    return encodeURIComponent(value);
}

function queryString(params: Record<string, string | number | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.append(key, String(value));
    }
    const serialized = query.toString();
    return serialized ? `?${serialized}` : '';
}

/** Same encoding, for callers whose params are a typed interface (no index signature). */
function queryStringFrom(params: object): string {
    return queryString(params as Record<string, string | number | undefined>);
}

/** Spec section 1/3: every moderator — who, account status, assigned-at/by. */
export function listModerators(): Promise<{ moderators: ModeratorEntry[] }> {
    return apiClient<{ moderators: ModeratorEntry[] }>('/api/admin/moderators');
}

/**
 * Spec section 1/3: grant the Moderator role to an existing user.
 * Admin-only. Safe to retry: an existing grant is a 409, never a duplicate.
 */
export function grantModerator(
    userId: string,
    reason?: string,
): Promise<{ success: boolean; grant: { userId: string; assignedAt: string; assignedBy: string } }> {
    return apiClient(`/api/admin/moderators/${enc(userId)}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}

/**
 * Spec section 3: remove moderator access. The underlying account is
 * untouched — use suspendUser/reactivateUser for account status.
 */
export function revokeModerator(userId: string): Promise<{ success: boolean; userId: string }> {
    return apiClient(`/api/admin/moderators/${enc(userId)}`, { method: 'DELETE' });
}

/** Spec section 3/7: suspend the underlying user (audit-logged, 403s them everywhere). */
export function suspendUser(
    userId: string,
    reason?: string,
): Promise<{ success: boolean; user: { id: string; status: string; trustLevel: string }; message: string }> {
    return apiClient(`/api/admin/users/${enc(userId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'SUSPENDED', reason }),
    });
}

/** Spec section 3/7: reactivate a suspended/deactivated user; access returns. */
export function reactivateUser(
    userId: string,
): Promise<{ success: boolean; user: { id: string; status: string; trustLevel: string }; message: string }> {
    return apiClient(`/api/admin/users/${enc(userId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'ACTIVE' }),
    });
}

const QUEUE_DEFAULT_STATUS: Record<ModerationQueue, string> = {
    jobs: 'PENDING_REVIEW',
    interviews: 'ACTIVE',
    updates: 'ACTIVE',
    'hiring-posts': 'ACTIVE',
    resources: 'PENDING_REVIEW',
    reports: 'OPEN',
};

/**
 * Spec section 5: pending items for one moderation queue, newest first.
 * Queue mapping: jobs -> community job submissions; interviews/updates/
 * hiring-posts -> community moderation-queue kinds (interview/update/
 * hiring-post); resources -> resource collections; reports -> report triage.
 */
export async function listQueue(
    queue: ModerationQueue,
    params: { status?: string; page?: number; limit?: number } = {},
): Promise<ModerationQueueResult> {
    const status = params.status ?? QUEUE_DEFAULT_STATUS[queue];
    const { page, limit } = params;

    if (queue === 'jobs') {
        const res = await apiClient<{ submissions: unknown[]; pendingCount: number; status: string }>(
            `/api/admin/opportunities/community-submissions${queryString({ status })}`,
        );
        return { items: res.submissions, total: res.pendingCount };
    }

    if (queue === 'interviews' || queue === 'updates' || queue === 'hiring-posts') {
        const kind = queue === 'interviews' ? 'interview' : queue === 'updates' ? 'update' : 'hiring-post';
        const res = await apiClient<{ items: unknown[]; total: number; page: number; limit: number }>(
            `/api/admin/community/moderation-queue${queryString({ kind, status, page, limit })}`,
        );
        return { items: res.items, total: res.total, page: res.page, limit: res.limit };
    }

    if (queue === 'resources') {
        const res = await apiClient<{
            resources: unknown[];
            pagination: { total: number; page: number; limit: number; pages: number };
        }>(`/api/admin/resources${queryString({ status, page, limit })}`);
        return { items: res.resources, total: res.pagination.total, page: res.pagination.page, limit: res.pagination.limit };
    }

    const res = await apiClient<{
        reports: unknown[];
        pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/api/admin/reports${queryString({ status, page, limit })}`);
    return { items: res.reports, total: res.pagination.total, page: res.pagination.page, limit: res.pagination.limit };
}

const QUEUE_ACTIONS: Record<ModerationQueue, readonly QueueReviewAction[]> = {
    jobs: ['approve', 'reject'],
    interviews: ['remove', 'spam', 'restore'],
    updates: ['remove'],
    'hiring-posts': ['remove', 'spam', 'restore'],
    resources: ['approve', 'reject'],
    reports: ['resolve', 'dismiss'],
};

/**
 * Spec sections 4/5/6: approve/remove/reject/restore one queued item.
 * Every action updates user-facing state (publish, soft-delete/status change,
 * or report resolution) and is audit-logged server-side. Invalid
 * queue/action combinations throw before any request is sent.
 */
export function reviewItem(
    queue: ModerationQueue,
    id: string,
    action: QueueReviewAction,
    reason?: string,
): Promise<unknown> {
    if (!QUEUE_ACTIONS[queue].includes(action)) {
        throw new Error(`Action "${action}" is not valid for queue "${queue}"`);
    }
    const itemId = enc(id);
    const note = reason ?? 'Actioned by moderator';

    if (queue === 'jobs') {
        return action === 'approve'
            ? apiClient(`/api/admin/opportunities/community-submissions/${itemId}/approve`, { method: 'POST' })
            : apiClient(`/api/admin/opportunities/community-submissions/${itemId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: note }),
            });
    }

    if (queue === 'resources') {
        return action === 'approve'
            ? apiClient(`/api/admin/resources/${itemId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'APPROVED' }),
            })
            : apiClient(`/api/admin/resources/${itemId}`, { method: 'DELETE' });
    }

    if (queue === 'reports') {
        return resolveReport(itemId, action as ReportResolutionAction, reason);
    }

    if (queue === 'updates') {
        return apiClient(`/api/admin/community/updates/${itemId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: note }),
        });
    }

    const base = queue === 'interviews' ? '/api/admin/community/interviews' : '/api/admin/community/posts';
    if (action === 'remove') {
        return apiClient(`${base}/${itemId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: note }),
        });
    }
    if (action === 'spam') {
        return apiClient(`${base}/${itemId}/spam`, {
            method: 'POST',
            body: JSON.stringify({ reason: note }),
        });
    }
    return apiClient(`${base}/${itemId}/restore`, { method: 'POST' });
}

/** Spec section 6: report triage queue, newest first (defaults to OPEN). */
export function listReports(status?: AdminReportStatus): Promise<{
    reports: AdminReport[];
    openCount: number;
    status: string;
    pagination: { total: number; page: number; limit: number; pages: number };
}> {
    return apiClient(`/api/admin/reports${queryString({ status })}`);
}

/**
 * Spec section 6: resolve or dismiss one report. Terminal states are
 * guarded server-side (re-resolving is a 409). Content removal, when
 * warranted, goes through reviewItem on the owning queue.
 */
export function resolveReport(
    id: string,
    action: ReportResolutionAction,
    reason?: string,
): Promise<{ success: boolean }> {
    return apiClient(`/api/admin/reports/${enc(id)}/${action === 'resolve' ? 'resolve' : 'dismiss'}`, {
        method: 'POST',
        body: JSON.stringify({ note: reason }),
    });
}

/** Spec section 8: audit trail — who/what/object/when/reason, newest first. Admin-only. */
export function auditLog(params: AuditLogParams = {}): Promise<{
    entries: AuditEntry[];
    pagination: { total: number; page: number; limit: number; pages: number };
}> {
    return apiClient(`/api/admin/audit${queryStringFrom(params)}`);
}

/**
 * Additive (not part of the ten-function contract): single queue-count
 * snapshot for moderator navigation. Backed by the new
 * GET /api/admin/moderation/overview endpoint (moderators AND admins pass).
 */
export function moderationOverview(): Promise<{ success: boolean; queues: ModerationOverview }> {
    return apiClient('/api/admin/moderation/overview');
}

export const moderationApi = {
    listModerators,
    grantModerator,
    revokeModerator,
    suspendUser,
    reactivateUser,
    listQueue,
    reviewItem,
    listReports,
    resolveReport,
    auditLog,
    moderationOverview,
};
