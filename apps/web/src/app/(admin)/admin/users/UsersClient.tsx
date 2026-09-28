'use client';

import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { useModerators } from '@/features/admin/moderators/useModerators';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { ErrorMessage } from '@/ui/ErrorMessage';
import UsersDialogs from './_components/UsersDialogs';
import { UsersProvider, useUsersDialogs } from './_components/UsersProvider';
import UsersTable from './_components/UsersTable';

type ModeratorsData = ReturnType<typeof useModerators>;

/** Single source for the page description, shared by the loaded and error shells. */
const PAGE_DESCRIPTION = 'Review account status, roles and access.';

export default function AdminUsersPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const data = useModerators(isAuthenticated);
    const { moderators, users, loading, loadError, refresh } = data;
    const hasData = moderators.length > 0 || users.length > 0;

    // Full-screen loader only when there is truly nothing to show yet.
    // Revisits render the cached rows instantly while `refresh` runs quietly
    // (a small "Updating…" badge in the header marks the background fetch).
    if (loading && !hasData) {
        return <LoadingScreen message="Loading users data..." />;
    }

    if (loadError && moderators.length === 0 && users.length === 0) {
        return (
            <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-4 text-foreground md:p-8">
                <header className="border-b border-border pb-5">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                    <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
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
    const moderatorCount = moderators.length;

    return (
        // Fixed shell, matching /admin/opportunities: the page deliberately does
        // not scroll, it hands a bounded height down so the grid's own footer —
        // search, pagination, rows-per-page — is always visible.
        //
        // No page-level `pt-16`: AdminLayoutClient already reserves the mobile
        // top offset with `pt-14 md:pt-18 lg:pt-0` on the content column, so
        // restating it here double-stacked the gap. `pb-20` is the clearance for
        // the fixed AdminBottomNav, which DOES render on this path (it returns
        // null only on the form paths) and is `md:hidden`, so `md:p-8` — which
        // includes the bottom edge — takes over from there.
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 text-foreground md:p-8">
            {/* One header row in the shadcn-admin `index.tsx` shape: a short
                title and one line of description on the left, the single
                working primary action on the right. The user total is not
                repeated here — the DataGrid toolbar owns that count. */}
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
                    <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {moderatorCount > 0 ? (
                        <Badge variant="outline" size="sm">
                            {moderatorCount} {moderatorCount === 1 ? 'moderator' : 'moderators'}
                        </Badge>
                    ) : null}
                    {loading ? (
                        <Badge variant="muted" size="sm" aria-live="polite">
                            Updating…
                        </Badge>
                    ) : null}
                    <Button size="sm" onClick={openGrant}>
                        Grant moderator
                    </Button>
                </div>
            </div>

            {loadError ? (
                <ErrorMessage
                    className="shrink-0"
                    message={loadError}
                    onRetry={() => void refresh()}
                    variant="subtle"
                />
            ) : null}

            {/* The moderator list and the audit slice both lived here as their own
                cards. Moderator identity is already a column and a Role filter in
                the table below, and audit history belongs on /admin/audit.

                `flex-col` is load-bearing: the grid sizes with `flex-1`, which
                only engages inside a flex parent. As a plain block div the grid
                grew to full content height, so its scroller had nothing to
                constrain and the shell's `overflow-hidden` clipped the footer.

                Layout-only on purpose — no border, background, radius, shadow or
                padding. The DataGrid renders exactly one `rounded-md border`
                surface here (variant="bare"); adding an outer frame put a card
                inside a card, the same box-in-a-box /admin/settings warns about. */}
            <div className="flex min-h-0 flex-1 flex-col">
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
