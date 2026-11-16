import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type DirectoryState = {
    q: string;
    status: string;
    role: string;
    pageIndex: number;
    pageSize: number;
};

const DEFAULT_DIRECTORY: DirectoryState = { q: '', status: '', role: '', pageIndex: 0, pageSize: 20 };

type ModeratorsSnapshot = {
    moderators: ModeratorListEntry[];
    users: DirectoryUser[];
    directoryTotal: number;
    directoryPageCount: number;
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
    const [directory, setDirectory] = useState<DirectoryState>(DEFAULT_DIRECTORY);
    const [directoryTotal, setDirectoryTotal] = useState<number>(() => moderatorsSnapshot?.directoryTotal ?? 0);
    const [directoryPageCount, setDirectoryPageCount] = useState<number>(
        () => moderatorsSnapshot?.directoryPageCount ?? 1,
    );
    const [directoryLoading, setDirectoryLoading] = useState(false);
    // Read by `refresh` so an unrelated refresh (grant, revoke, suspend) keeps
    // the current filters and page instead of jumping back to the first one.
    const directoryRef = useRef<DirectoryState>(DEFAULT_DIRECTORY);
    const [audit, setAudit] = useState<ModeratorAuditRecord[]>(() => moderatorsSnapshot?.audit ?? []);
    const [loading, setLoading] = useState(() => moderatorsSnapshot === null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    const [bulkPending, setBulkPending] = useState(false);

    /** One page of the directory, filtered and paged in the API. */
    const fetchDirectory = useCallback(async (params: DirectoryState) => {
        setDirectoryLoading(true);
        try {
            const page = await listDirectoryUsers({
                q: params.q.trim() || undefined,
                status: params.status || undefined,
                role: params.role || undefined,
                page: params.pageIndex + 1,
                pageSize: params.pageSize,
            });
            setUsers(page.users);
            setDirectoryTotal(page.total);
            setDirectoryPageCount(page.pageCount);
            moderatorsSnapshot = {
                ...(moderatorsSnapshot ?? { moderators: [], audit: [], directoryTotal: 0, directoryPageCount: 1 }),
                users: page.users,
                directoryTotal: page.total,
                directoryPageCount: page.pageCount,
            };
        } finally {
            setDirectoryLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        setLoadError(null);
        try {
            const [mods] = await Promise.all([
                listModerators(),
                // One bounded page for the table. The grant picker searches the
                // API instead of this page, so an account outside it is still
                // selectable.
                fetchDirectory(directoryRef.current),
            ]);
            setModerators(mods);
            moderatorsSnapshot = {
                ...(moderatorsSnapshot ?? { users: [], audit: [], directoryTotal: 0, directoryPageCount: 1 }),
                moderators: mods,
            };
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
            moderatorsSnapshot = {
                ...(moderatorsSnapshot ?? { moderators: [], users: [], directoryTotal: 0, directoryPageCount: 1 }),
                audit: entries,
            };
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

    /**
     * Search every registered user for the grant picker.
     *
     * This hits the API rather than filtering `users`, because `users` is only
     * the newest page. Filtering it meant an older account could not be granted
     * the role at all — the picker simply reported no match.
     */
    const searchUsers = useCallback(
        async (query: string, limit = 8): Promise<DirectoryUser[]> => {
            const q = query.trim();
            if (q.length < 2) return [];
            const page = await listDirectoryUsers({ q, pageSize: limit });
            return page.users.filter((u) => !moderatorIds.has(u.id));
        },
        [moderatorIds],
    );

    useEffect(() => {
        directoryRef.current = directory;
    }, [directory]);

    /** Any filter change returns to page 1; paging keeps the filters. */
    const updateDirectory = useCallback((patch: Partial<DirectoryState>) => {
        const filterChanged =
            patch.q !== undefined || patch.status !== undefined || patch.role !== undefined || patch.pageSize !== undefined;
        setDirectory((prev) => ({ ...prev, ...patch, ...(filterChanged ? { pageIndex: 0 } : {}) }));
    }, []);

    const searchDirectory = useCallback((query: string) => updateDirectory({ q: query }), [updateDirectory]);
    const setDirectoryStatus = useCallback((status: string) => updateDirectory({ status }), [updateDirectory]);
    const setDirectoryRole = useCallback((role: string) => updateDirectory({ role }), [updateDirectory]);
    const setDirectoryPageIndex = useCallback((pageIndex: number) => updateDirectory({ pageIndex }), [updateDirectory]);
    const setDirectoryPageSize = useCallback((pageSize: number) => updateDirectory({ pageSize }), [updateDirectory]);

    // One fetch per settled state. The mount effect above owns the first load;
    // text search is debounced, page and facet changes fetch immediately.
    const directoryReady = useRef(false);
    useEffect(() => {
        if (!isAuthenticated) return;
        if (!directoryReady.current) {
            directoryReady.current = true;
            return;
        }
        const timer = setTimeout(() => {
            void fetchDirectory(directory).catch(() => {
                // Keep the current rows; the page banner already reports a
                // failed directory refresh.
            });
        }, directory.q.trim() ? 250 : 0);
        return () => clearTimeout(timer);
    }, [directory, isAuthenticated, fetchDirectory]);

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
        directoryTotal,
        directoryQuery: directory.q,
        directoryStatus: directory.status,
        directoryRole: directory.role,
        directoryPageIndex: directory.pageIndex,
        directoryPageSize: directory.pageSize,
        directoryPageCount,
        directoryLoading,
        searchDirectory,
        setDirectoryStatus,
        setDirectoryRole,
        setDirectoryPageIndex,
        setDirectoryPageSize,
        audit,
        loading,
        loadError,
        actingId,
        bulkPending,
        moderatorIds,
        searchUsers,
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
