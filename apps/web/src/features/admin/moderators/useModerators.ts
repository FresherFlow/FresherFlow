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

export function useModerators(isAuthenticated: boolean) {
    const [moderators, setModerators] = useState<ModeratorListEntry[]>([]);
    const [users, setUsers] = useState<DirectoryUser[]>([]);
    const [audit, setAudit] = useState<ModeratorAuditRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoadError(null);
        try {
            const [mods, directory] = await Promise.all([listModerators(), listDirectoryUsers()]);
            setModerators(mods);
            setUsers(directory);
        } catch (err) {
            // Graceful empty state when the API slice lands later.
            setModerators([]);
            setUsers([]);
            setLoadError(getErrorMessage(err, 'Could not load moderators. Please retry.'));
        }
    }, []);

    const refreshAudit = useCallback(async () => {
        try {
            setAudit(await auditLog({ limit: 50 }));
        } catch {
            setAudit([]);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        setLoading(true);
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

    return {
        moderators,
        users,
        audit,
        loading,
        loadError,
        actingId,
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
    };
}
