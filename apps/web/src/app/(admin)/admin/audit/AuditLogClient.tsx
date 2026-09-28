'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/api/admin';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { getErrorMessage } from '@/lib/utils/error';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Input } from '@/ui/Input';
import { DataGrid } from '@/ui/data-grid/DataGrid';
import { ACTION_OPTIONS, ALL_ACTIONS, buildAuditColumns, type AuditEntry } from './AuditColumns';

/** Last good audit payload, shared across mounts (stale-while-revalidate):
 * client-side navigation remounts the page, and refetching from empty flashes
 * a full loading screen on every visit. Revisits render instantly. */
let auditSnapshot: AuditEntry[] | null = null;
let auditSnapshotAt = 0;
const AUDIT_SNAPSHOT_TTL_MS = 60_000;

/** Short purpose line for the page. The old copy leaked API implementation
 * detail ("the legacy Firebase feedback view is not a moderation dependency")
 * into user-facing text; an operator only needs to know what the page is. */
const PAGE_DESCRIPTION = 'Every moderator and admin action, newest first.';

export default function AuditLogClient() {
    const { isAuthenticated } = useFirebaseAdmin();
    const [entries, setEntries] = useState<AuditEntry[]>(() => auditSnapshot ?? []);
    const [action, setAction] = useState('');
    const [actorId, setActorId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(() => auditSnapshot === null);
    const [error, setError] = useState<string | null>(null);

    const columns = useMemo(() => buildAuditColumns(), []);

    const fetchAudit = useCallback(async () => {
        // Safe to mark loading even with rows on screen: the full-screen
        // loader below only renders when there are zero rows.
        setLoading(true);
        setError(null);
        try {
            const res = (await adminApi.getAuditLog({
                actorId: actorId.trim() || undefined,
                action: action || undefined,
                targetId: targetId.trim() || undefined,
                limit: 100,
            })) as { entries: AuditEntry[] };
            const next = res.entries || [];
            setEntries(next);
            // Cache only the unfiltered view — filtered views must not poison
            // revisits with a subset.
            if (!actorId.trim() && !action && !targetId.trim()) {
                auditSnapshot = next;
                auditSnapshotAt = Date.now();
            }
        } catch (err) {
            // Keep stale rows on failure; the inline error below surfaces retry.
            setError(getErrorMessage(err, 'Could not load the audit log. Please retry.'));
        } finally {
            setLoading(false);
        }
    }, [action, actorId, targetId]);

    useEffect(() => {
        if (!isAuthenticated) return;
        // Fresh unfiltered snapshot: render it, skip the fetch entirely.
        // Filtered views always fetch (they are never cached).
        if (!action && !actorId.trim() && !targetId.trim() && auditSnapshot !== null && Date.now() - auditSnapshotAt < AUDIT_SNAPSHOT_TTL_MS) {
            setLoading(false);
            return;
        }
        void fetchAudit();
    }, [isAuthenticated, fetchAudit]);

    const clearFilters = useCallback(() => {
        setAction('');
        setActorId('');
        setTargetId('');
    }, []);

    const hasFilters = action !== '' || actorId.trim() !== '' || targetId.trim() !== '';

    // One node, two call sites: the grid shows it when its own search or the
    // page filters exclude every loaded row, and the page shows it when the
    // server returned nothing for the current filters. A filtered-to-zero
    // result must NOT read as "the log is empty" — the log has rows, the
    // filter excluded them.
    const noMatches = (
        <EmptyState
            title="No matching entries"
            description="Nothing in this log matches the current search and filters."
            icon="search"
            size="md"
            variant="ghost"
            action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                    Clear filters
                </Button>
            }
        />
    );

    if (loading && entries.length === 0) {
        return <LoadingScreen message="Loading audit log..." />;
    }

    // No rows and nothing loading: the first load failed, so there is nothing
    // to keep on screen behind the error. A failure that arrives WITH rows
    // (background refresh, filter change) falls through to the subtle inline
    // error and leaves the stale log readable.
    if (error && entries.length === 0) {
        return (
            <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-4 text-foreground md:p-8">
                {/* No page-level `pt-*`: the shell already reserves the fixed
                    MobileTopNav (`pt-14 md:pt-18 lg:pt-0`). */}
                <PageHeader updating={false} onRefresh={() => void fetchAudit()} />
                <ErrorMessage
                    title="Could not load the audit log"
                    message={error}
                    onRetry={() => void fetchAudit()}
                    variant="card"
                />
            </div>
        );
    }

    return (
        // Fixed-shell page, matching `/admin/users`: the PAGE does not scroll.
        // `overflow-hidden` plus a `min-h-0 flex-1` hand-off means the DataGrid
        // body is the only scroller, so the toolbar and the pagination stay
        // pinned instead of scrolling away with 87 rows. Every link in that
        // chain must be a flex container — a block wrapper makes the grid's
        // `flex-1` inert, the card grows to content height and the footer is
        // clipped with nowhere to scroll.
        //
        // No page-level top padding: AdminLayoutClient already reserves the
        // mobile top offset with `pt-14 md:pt-18 lg:pt-0`, so restating it here
        // double-stacked the gap. `pb-20` clears the fixed AdminBottomNav.
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 text-foreground md:p-8">
            <PageHeader updating={loading && entries.length > 0} onRefresh={() => void fetchAudit()} />

            {error ? (
                <ErrorMessage
                    className="shrink-0"
                    message={error}
                    onRetry={() => void fetchAudit()}
                    variant="subtle"
                />
            ) : null}

            {entries.length === 0 ? (
                hasFilters ? (
                    noMatches
                ) : (
                    <EmptyState
                        title="No audit entries yet"
                        description="Moderator and admin actions will show up here as they happen."
                        icon="inbox"
                        size="md"
                        variant="ghost"
                    />
                )
            ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                    <DataGrid<AuditEntry>
                    data={entries}
                    columns={columns}
                    getRowId={(row) => row.id}
                    title="Entries"
                    countLabel="entries"
                    // No bulk action exists for an append-only audit log, so
                    // selection is off rather than shipping dead checkboxes.
                    enableSelection={false}
                    // Not passed: a background refresh (filter change, manual
                    // reload) must not blank rows that are already on screen.
                    searchPlaceholder="Search actor, action, object or reason…"
                    showViewOptions
                    statusValue={action || ALL_ACTIONS}
                    statusOptions={ACTION_OPTIONS}
                    onStatusChange={(value) => setAction(value === ALL_ACTIONS ? '' : value)}
                    onClear={clearFilters}
                    actions={() => (
                        <>
                            {/* Server-side id lookups — the grid's single search
                                box only filters the rows already loaded, so the
                                two exact-id queries stay explicit controls.
                                `variant="form"`, not `search`: the compact
                                search variant is 12px, and these sat in the same
                                toolbar as the 14px grid search beside them. */}
                            <Input
                                type="search"
                                variant="form"
                                aria-label="Filter by actor id"
                                placeholder="Actor id…"
                                value={actorId}
                                onChange={(event) => setActorId(event.target.value)}
                                className="h-9 w-full sm:w-40"
                            />
                            <Input
                                type="search"
                                variant="form"
                                aria-label="Filter by object id"
                                placeholder="Object id…"
                                value={targetId}
                                onChange={(event) => setTargetId(event.target.value)}
                                className="h-9 w-full sm:w-40"
                            />
                        </>
                    )}
                    noResults={noMatches}
                    /* The bare root already carries `flex min-h-0 flex-1 flex-col`
                       and renders exactly one `rounded-md border` surface, so the
                       page adds no frame of its own. */
                    variant="bare"
                    className="min-h-0 flex-1"
                    />
                </div>
            )}
        </div>
    );
}

/** One header row, shadcn-admin `index.tsx` shape: short title and a single
 *  line of description on the left, the one working action on the right. The
 *  entry count is not repeated here — the grid toolbar owns it.
 *
 *  The `h1` is `sr-only` below `lg`: `MobileTopNav` already prints the route
 *  name on a phone and `TopHeaderBar` prints it at `lg+`, so a visible heading
 *  made the page name appear twice on mobile. `sr-only` keeps it as the page's
 *  heading for screen readers; `lg:not-sr-only` restores the desktop rendering. */
function PageHeader({ updating, onRefresh }: { updating: boolean; onRefresh: () => void }) {
    return (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
                <h1 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight text-foreground">Audit log</h1>
                <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {updating ? (
                    <Badge variant="muted" size="sm" aria-live="polite">
                        Updating…
                    </Badge>
                ) : null}
                <Button variant="admin" size="sm" onClick={onRefresh}>
                    <ArrowPathIcon className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </div>
    );
}
