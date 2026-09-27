import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/error';
import {
    auditLog,
    grantModerator,
    listDirectoryUsers,
    listModerators,
    reactivateUser,
    revokeModerator,
    suspendUser,
    type DirectoryUser,
    type ModeratorAuditRecord,
    type ModeratorListEntry,
} from './moderationContract';

type ModeratorsSnapshot = {
    moderators: ModeratorListEntry[];
    users: DirectoryUser[];
    audit: ModeratorAuditRecord[];
};

/** Last good payload, shared across mounts (see useModerators). */
let moderatorsSnapshot: ModeratorsSnapshot | null = null;
/** When the snapshot was written — revisits within the TTL skip the
    background refetch entirely, so nothing swaps or flashes. */
let moderatorsSnapshotAt = 0;
const MODERATORS_SNAPSHOT_TTL_MS = 60_000;

/** True when a fresh-enough snapshot exists (no fetch needed on mount). */
export function hasFreshModeratorsSnapshot(): boolean {
    return moderatorsSnapshot !== null && Date.now() - moderatorsSnapshotAt < MODERATORS_SNAPSHOT_TTL_MS;
}

export function useModerators(isAuthenticated: boolean) {
    // Stale-while-revalidate across mounts: client-side navigation remounts
    // the page, and refetching from empty flashes a full loading screen on
    // every visit (the "refresh" operators see). The module snapshot keeps
    // the last good payload so revisits render instantly and refresh quietly.
    const [moderators, setModerators] = useState<ModeratorListEntry[]>(
        () => moderatorsSnapshot?.moderators ?? [],
    );
    const [users, setUsers] = useState<DirectoryUser[]>(() => moderatorsSnapshot?.users ?? []);
    const [audit, setAudit] = useState<ModeratorAuditRecord[]>(() => moderatorsSnapshot?.audit ?? []);
    const [loading, setLoading] = useState(() => moderatorsSnapshot === null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    const [bulkPending, setBulkPending] = useState(false);

    const refresh = useCallback(async () => {
        setLoadError(null);
        try {
            const [mods, directory] = await Promise.all([listModerators(), listDirectoryUsers()]);
            setModerators(mods);
            setUsers(directory);
            moderatorsSnapshot = { ...(moderatorsSnapshot ?? { audit: [] }), moderators: mods, users: directory };
            moderatorsSnapshotAt = Date.now();
        } catch (err) {
            // Keep stale rows on failure — wiping to empty would blank the
            // page on every transient error. The subtle error banner (not a
            // full screen) surfaces the retry.
            setLoadError(getErrorMessage(err, 'Could not load moderators. Please retry.'));
        }
    }, []);

    const refreshAudit = useCallback(async () => {
        try {
            const entries = await auditLog({ limit: 50 });
            setAudit(entries);
            moderatorsSnapshot = { ...(moderatorsSnapshot ?? { moderators: [], users: [] }), audit: entries };
        } catch {
            // Keep stale audit rows; see above.
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        // Fresh snapshot: render it, skip the fetch — zero flash, zero swap.
        if (hasFreshModeratorsSnapshot()) {
            setLoading(false);
            return;
        }
        // Background refresh when a snapshot exists — no full-screen loader.
        if (moderatorsSnapshot === null) setLoading(true);
        void (async () => {
            await refresh();
            await refreshAudit();
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, refresh, refreshAudit]);

    /** Spec §1: no-duplicate safeguard — a user already holding the role is never a grant candidate. */
    const moderatorIds = useMemo(() => new Set(moderators.map((m) => m.id)), [moderators]);

    const grantCandidates = useCallback(
        (query: string, limit = 8): DirectoryUser[] => {
            const q = query.trim().toLowerCase();
            if (!q) return [];
            return users
                .filter((u) => {
                    if (moderatorIds.has(u.id)) return false;
                    return (
                        (u.email ?? '').toLowerCase().includes(q) ||
                        (u.username ?? '').toLowerCase().includes(q) ||
                        (u.fullName ?? '').toLowerCase().includes(q)
                    );
                })
                .slice(0, limit);
        },
        [moderatorIds, users],
    );

    async function runActing(userId: string, label: string, fn: () => Promise<void>) {
        setActingId(userId);
        const tid = toast.loading(`${label}…`);
        try {
            await fn();
            await refresh();
            await refreshAudit();
            toast.success(label, { id: tid });
        } catch (err) {
            toast.error(getErrorMessage(err, `Could not complete: ${label.toLowerCase()}. Please retry.`), {
                id: tid,
            });
        } finally {
            setActingId(null);
        }
    }

    async function runBulk(
        userIds: string[],
        reason: string | undefined,
        action: 'suspend' | 'reactivate',
        fn: (id: string, reason: string) => Promise<void>,
    ) {
        if (userIds.length === 0) return;
        const verb = action === 'suspend' ? 'Suspending' : 'Reactivating';
        const past = action === 'suspend' ? 'Suspended' : 'Reactivated';
        setBulkPending(true);
        const tid = toast.loading(`${verb} ${userIds.length} user${userIds.length === 1 ? '' : 's'}…`);
        let ok = 0;
        let firstError: string | null = null;
        for (const id of userIds) {
            try {
                // Sequential per-user writes — one audit row each.
                await fn(id, reason ?? `${past} by admin (bulk)`);
                ok++;
            } catch (err) {
                if (!firstError) firstError = getErrorMessage(err, `${verb} failed`);
            }
        }
        await refresh();
        await refreshAudit();
        setBulkPending(false);
        if (ok === userIds.length) {
            toast.success(`${past} ${ok} user${ok === 1 ? '' : 's'}`, { id: tid });
        } else if (ok > 0) {
            toast.error(`${past} ${ok} of ${userIds.length}. First error: ${firstError}`, { id: tid });
        } else {
            toast.error(firstError ?? `${verb} failed`, { id: tid });
        }
    }

    return {
        moderators,
        users,
        audit,
        loading,
        loadError,
        actingId,
        bulkPending,
        moderatorIds,
        grantCandidates,
        refresh,
        grant: (userId: string, reason?: string) =>
            runActing(userId, 'Moderator access granted', () => grantModerator(userId, reason)),
        revoke: (userId: string) =>
            runActing(userId, 'Moderator access removed', () => revokeModerator(userId).then(() => undefined)),
        suspend: (userId: string, reason: string) =>
            runActing(userId, 'User suspended', () => suspendUser(userId, reason).then(() => undefined)),
        reactivate: (userId: string) =>
            runActing(userId, 'User reactivated', () => reactivateUser(userId).then(() => undefined)),
        suspendMany: (userIds: string[], reason: string) =>
            runBulk(userIds, reason, 'suspend', (id, r) => suspendUser(id, r).then(() => undefined)),
        reactivateMany: (userIds: string[]) =>
            runBulk(userIds, undefined, 'reactivate', (id) => reactivateUser(id).then(() => undefined)),
    };
}
