'use client';

import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { useModerators } from '@/features/admin/moderators/useModerators';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { Button } from '@/ui/Button';
import { ErrorMessage } from '@/ui/ErrorMessage';
import UsersDialogs from './_components/UsersDialogs';
import { UsersProvider, useUsersDialogs } from './_components/UsersProvider';
import UsersTable from './_components/UsersTable';

type ModeratorsData = ReturnType<typeof useModerators>;

export default function AdminUsersPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const data = useModerators(isAuthenticated);
    const { moderators, users, loading, loadError, refresh } = data;
    const hasData = moderators.length > 0 || users.length > 0;

    // Full-screen loader only when there is truly nothing to show yet.
    // Revisits render the cached rows instantly while `refresh` runs quietly
    // (a small "Updating…" pill in the header marks the background fetch).
    if (loading && !hasData) {
        return <LoadingScreen message="Loading users data..." />;
    }

    if (loadError && moderators.length === 0 && users.length === 0) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 pt-16 md:p-8 md:pt-8 pb-28 md:pb-8">
                <header className="border-b border-border pb-5">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users &amp; moderators</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Grant review access to an existing user and manage account status.
                    </p>
                </header>
                <ErrorMessage
                    title="Could not load users data"
                    message={loadError}
                    onRetry={() => void refresh()}
                    variant="card"
                />
            </div>
        );
    }

    return (
        <UsersProvider>
            <UsersPageBody data={data} />
        </UsersProvider>
    );
}

function UsersPageBody({ data }: { data: ModeratorsData }) {
    const {
        moderators,
        users,
        loading,
        loadError,
        actingId,
        bulkPending,
        moderatorIds,
        grantCandidates,
        refresh,
        grant,
        revoke,
        suspend,
        reactivate,
        suspendMany,
        reactivateMany,
    } = data;
    const { openGrant, setSuspendTarget, setReactivateTarget, setRevokeTarget, setBulkSuspendTargets, setBulkReactivateTargets } = useUsersDialogs();

    return (
        // Layout follows /admin/settings (same title block, section heading and
        // card), but stays a fixed shell rather than a scrolling page so the
        // table's own footer — search, pagination, rows-per-page — is always
        // visible instead of being scrolled out of reach.
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-16 text-foreground md:p-8 md:pt-8">
            {/* Title block, matching the /admin/settings page. */}
            <div className="flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users &amp; moderators</h1>
                    <p className="text-muted-foreground">
                        Manage account status and grant review access to an existing user.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{users.length}</span> Total Users
                        <span aria-hidden>·</span>
                        <span className="font-bold text-foreground">{moderators.length}</span> Moderators
                        {loading ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                Updating…
                            </span>
                        ) : null}
                    </div>
                    <Button size="sm" onClick={openGrant}>
                        Grant moderator
                    </Button>
                </div>
            </div>

            {loadError ? (
                <ErrorMessage message={loadError} onRetry={() => void refresh()} variant="subtle" />
            ) : null}

            {/* The moderator list and the audit slice both lived here as their own
                cards. Moderator identity is already a column and a Role filter in
                the table below, and audit history belongs on /admin/audit. */}
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="shrink-0 space-y-1.5">
                    <h2 className="text-xl font-bold tracking-tight">Registered users</h2>
                    <p className="max-w-md text-xs leading-normal text-muted-foreground">
                        Search, sort and filter every account. Select rows to suspend or reactivate in bulk.
                    </p>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card p-2 shadow-xs">
                    <UsersTable
                        users={users}
                        moderatorIds={moderatorIds}
                        actingId={actingId}
                        onSuspend={setSuspendTarget}
                        onReactivate={setReactivateTarget}
                        onBulkSuspend={setBulkSuspendTargets}
                        onBulkReactivate={setBulkReactivateTargets}
                    />
                </div>
            </div>

            <UsersDialogs
                actingId={actingId}
                bulkPending={bulkPending}
                grantCandidates={grantCandidates}
                grant={grant}
                revoke={revoke}
                suspend={suspend}
                reactivate={reactivate}
                suspendMany={suspendMany}
                reactivateMany={reactivateMany}
            />
        </div>
    );
}
