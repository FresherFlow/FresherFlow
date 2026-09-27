'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { getErrorMessage } from '@/lib/utils/error';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';

interface AuditEntry {
    id: string;
    action: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
    user: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
}

const ACTION_FILTERS = ['CREATE', 'UPDATE', 'DELETE', 'EXPIRE', 'BULK_ACTION', 'EXPORT', 'REJECT', 'SPAM'];

/**
 * Last good audit payload, shared across mounts (stale-while-revalidate):
 * client-side navigation remounts the page, and refetching from empty
 * flashes a full loading screen on every visit. Revisits render instantly.
 */
let auditSnapshot: AuditEntry[] | null = null;
let auditSnapshotAt = 0;
const AUDIT_SNAPSHOT_TTL_MS = 60_000;// TODO(spec): moderator grants audit as CREATE and revocations as DELETE until the
// parallel API slice extends the audit ACTIONS enum (e.g. MODERATOR_GRANT,
// MODERATOR_REVOKE, USER_SUSPEND, USER_REACTIVATE). Keep this list in sync with
// `apps/api/src/routes/admin/audit.ts` ACTIONS; unsupported values surface the
// error state below instead of failing silently.
const MODERATOR_ACTION_HINT = 'Grants audit as CREATE, revocations as DELETE, status changes as UPDATE.';

export default function AuditLogClient() {
    const { isAuthenticated } = useFirebaseAdmin();
    const [entries, setEntries] = useState<AuditEntry[]>(() => auditSnapshot ?? []);
    const [action, setAction] = useState('');
    const [actorId, setActorId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(() => auditSnapshot === null);
    const [error, setError] = useState<string | null>(null);

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

    if (loading && entries.length === 0) {
        return <LoadingScreen message="Loading audit log..." />;
    }

    return (
        // `flex-1 min-h-0 overflow-y-auto` is required: the admin shell clips its
        // content column, so a page without its own scroll container cannot be
        // scrolled and the bottom rows are unreachable. Matches the other admin
        // pages (dashboard, feedback, resources, rooms, settings).
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 pt-16 md:p-8 md:pt-8 pb-28 md:pb-8 text-foreground">
            <header className="border-b border-border pb-5">
                <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Who did what to which object, when, why, and with what result — including every moderator
                    action. {MODERATOR_ACTION_HINT}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {loading && entries.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                            Updating…
                        </span>
                    ) : null}
                    <select
                        aria-label="Filter by action"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                    >
                        <option value="">All actions</option>
                        {ACTION_FILTERS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <input
                        type="search"
                        aria-label="Filter by actor id"
                        value={actorId}
                        onChange={(e) => setActorId(e.target.value)}
                        placeholder="Actor user id…"
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                    />
                    <input
                        type="search"
                        aria-label="Filter by target object id"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder="Target object id…"
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                    />
                </div>
            </header>

            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
                    <p className="font-medium">Could not load audit log</p>
                    <p className="mt-1 text-muted-foreground">{error}</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                    <p className="font-medium">No audit entries yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">Moderation and admin actions will appear here.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Who</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Object</TableHead>
                                <TableHead>When</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Result</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        {entry.user?.username ? `@${entry.user.username}` : (entry.user?.fullName ?? entry.user?.email ?? entry.user?.id ?? '—')}
                                    </TableCell>
                                    <TableCell>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                            {entry.action}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-xs">{entry.targetId}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="whitespace-nowrap text-xs">
                                            {new Date(entry.createdAt).toLocaleString('en-IN')}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="block max-w-xs truncate text-sm text-muted-foreground">
                                            {entry.reason || '—'}
                                        </span>
                                    </TableCell>
                                    {/* TODO(spec): the audit API returns no result field; audited writes
                                        are successes by construction. Render '—' until the API adds one. */}
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">—</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
