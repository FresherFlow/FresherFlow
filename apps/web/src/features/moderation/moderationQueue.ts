'use client';

import { adminApi } from '@/lib/api/admin';
import { apiClient } from '@/lib/api/client';
import { ResourceItemStatus } from '@fresherflow/types';

/**
 * Local UI-side stub of the moderator-queues contract.
 *
 * TODO: replace this module with the canonical
 * `packages/api-client/src/admin/moderation.ts`
 * (`listQueue(queue)` / `reviewItem(queue, id, action, reason?)`) once the
 * parallel API agent lands it. Do NOT invent new backend routes here — every
 * function below delegates to an already-existing, already-reviewed admin
 * endpoint (the same URLs the queue components call today).
 */

export type ModerationQueue =
    | 'job-submissions'
    | 'interview-experiences'
    | 'hiring-updates'
    | 'resources'
    | 'community-reports'
    | 'community-content';

export type ReviewAction = 'approve' | 'reject' | 'remove';

export interface QueueSummary {
    id: string;
    title: string;
    subtitle: string;
    // Passthrough of the source row's timestamp; callers format it with
    // `new Date(...)` / `formatWhen(...)`, both of which accept either form.
    // `ResourceCollection.createdAt` is `string | Date` (packages/types).
    createdAt: string | Date;
    raw: unknown;
}

interface CommunitySubmissionLike {
    id: string;
    title: string;
    company: string | null;
    createdAt: string;
}

interface ModerationItemLike {
    id: string;
    title?: string | null;
    role?: string | null;
    createdAt: string;
}

interface ResourceLike {
    id: string;
    title: string;
    // `ResourceCollection.createdAt` is `string | Date` (packages/types), and the
    // admin resources endpoint returns it un-serialized for some rows.
    createdAt: string | Date;
}
interface ReportLike {
    id: string;
    reason: string;
    createdAt: string;
}

function submissionSubtitle(item: CommunitySubmissionLike): string {
    return item.company ? `${item.company}` : 'Community submission';
}

/**
 * Pending items for a queue. Reused endpoints only:
 * - job-submissions → GET /api/admin/opportunities/community-submissions?status=PENDING_REVIEW
 * - interview-experiences / hiring-updates / community-content → GET /api/admin/community/moderation-queue
 * - resources → GET /api/admin/resources?status=PENDING_REVIEW
 * - community-reports → GET /api/admin/reports?status=OPEN
 */
export async function listQueue(queue: ModerationQueue, limit = 50): Promise<QueueSummary[]> {
    switch (queue) {
        case 'job-submissions': {
            const result = await apiClient<{ submissions: CommunitySubmissionLike[] }>(
                `/api/admin/opportunities/community-submissions?status=${encodeURIComponent('PENDING_REVIEW')}`
            );
            return (result.submissions ?? []).map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: submissionSubtitle(item),
                createdAt: item.createdAt,
                raw: item,
            }));
        }
        case 'interview-experiences':
        case 'hiring-updates':
        case 'community-content': {
            const kind =
                queue === 'interview-experiences'
                    ? 'interview'
                    : queue === 'hiring-updates'
                      ? 'update'
                      : 'hiring-post';
            const result = (await adminApi.getModerationQueue({
                kind,
                status: 'ACTIVE',
                limit,
            })) as { items: ModerationItemLike[] };
            return (result.items ?? []).map((item) => ({
                id: item.id,
                title: item.title ?? item.role ?? 'Untitled',
                subtitle: queue,
                createdAt: item.createdAt,
                raw: item,
            }));
        }
        case 'resources': {
            const result = await adminApi.adminResourcesApi.getResources({
                status: ResourceItemStatus.PENDING_REVIEW,
                page: 1,
                limit,
            });
            return (result.resources ?? []).map((item: ResourceLike) => ({
                id: item.id,
                title: item.title,
                subtitle: 'Resource collection',
                createdAt: item.createdAt,
                raw: item,
            }));
        }
        case 'community-reports': {
            const result = (await adminApi.getReports({ status: 'OPEN', limit: limit })) as {
                reports: ReportLike[];
            };
            return (result.reports ?? []).map((item) => ({
                id: item.id,
                title: item.reason,
                subtitle: 'User report',
                createdAt: item.createdAt,
                raw: item,
            }));
        }
    }
}

/**
 * Approve / reject / remove one queued item, then let the caller refresh the
 * queue. Reason is required by callers for destructive actions (reject of a
 * job submission, remove of community content); resolve/dismiss of reports
 * forwards it as the audit note.
 *
 * Per-queue mapping (all pre-existing endpoints):
 * - job-submissions: approve → .../community-submissions/:id/approve,
 *   reject/remove → .../:id/reject { reason }
 * - interview-experiences / community-content: approve → .../restore,
 *   reject/remove → .../spam { reason }
 * - hiring-updates: reject/remove → DELETE .../updates/:id { reason }
 *   (permanent — no restore endpoint exists); approve is a no-op because
 *   updates are live on arrival.
 * - resources: approve → PATCH /api/admin/resources/:id { status: APPROVED },
 *   reject/remove → DELETE /api/admin/resources/:id.
 *   TODO(API): delete endpoint accepts no reason body, so the moderator's
 *   reason cannot be persisted yet — canonical moderation.ts should add it.
 * - community-reports: approve → .../reports/:id/resolve { note },
 *   reject → .../dismiss { note }, remove → resolve with note.
 *   Destructive removal of the reported *content* itself stays in
 *   ReportsQueue.removeContent, which knows the report target.
 */
export async function reviewItem(
    queue: ModerationQueue,
    id: string,
    action: ReviewAction,
    reason?: string
): Promise<void> {
    const safeId = encodeURIComponent(id);
    const body = reason ? JSON.stringify({ reason }) : JSON.stringify({});

    switch (queue) {
        case 'job-submissions': {
            const verb = action === 'approve' ? 'approve' : 'reject';
            await apiClient(`/api/admin/opportunities/community-submissions/${safeId}/${verb}`, {
                method: 'POST',
                body: action === 'approve' ? JSON.stringify({}) : body,
            });
            return;
        }
        case 'interview-experiences':
        case 'community-content': {
            const base =
                queue === 'interview-experiences'
                    ? `/api/admin/community/interviews/${safeId}`
                    : `/api/admin/community/posts/${safeId}`;
            if (action === 'approve') {
                await apiClient(`${base}/restore`, { method: 'POST' });
                return;
            }
            await apiClient(`${base}/spam`, { method: 'POST', body });
            return;
        }
        case 'hiring-updates': {
            if (action === 'approve') return;
            await apiClient(`/api/admin/community/updates/${safeId}`, {
                method: 'DELETE',
                body,
            });
            return;
        }
        case 'resources': {
            if (action === 'approve') {
                await adminApi.adminResourcesApi.updateResource(id, {
                    status: ResourceItemStatus.APPROVED,
                });
                return;
            }
            await adminApi.adminResourcesApi.deleteResource(id);
            return;
        }
        case 'community-reports': {
            if (action === 'reject') {
                await adminApi.dismissReport(id, reason);
                return;
            }
            await adminApi.resolveReport(id, reason);
            return;
        }
    }
}
