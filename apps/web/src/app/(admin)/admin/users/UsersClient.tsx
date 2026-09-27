'use client';

import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { useModerators } from '@/features/admin/moderators/useModerators';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { ErrorMessage } from '@/ui/ErrorMessage';
import UsersAudit from './_components/UsersAudit';
import UsersDialogs from './_components/UsersDialogs';
import UsersModerators from './_components/UsersModerators';
import { UsersProvider, useUsersDialogs } from './_components/UsersProvider';
import UsersTable from './_components/UsersTable';

type ModeratorsData = ReturnType<typeof useModerators>;

export default function AdminUsersPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const data = useModerators(isAuthenticated);
    const { moderators, users, loading, loadError, refresh } = data;

    if (loading) {
        return <LoadingScreen message="Loading users data..." />;
    }

    if (loadError && moderators.length === 0 && users.length === 0) {
        return (
            <div className="space-y-6 pb-12">
                <header className="border-b border-border pb-5">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users &amp; moderators</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Grant review access, manage account status, and review the audit trail.
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
        audit,
        loadError,
        actingId,
        moderatorIds,
        grantCandidates,
        refresh,
        grant,
        revoke,
        suspend,
        reactivate,
    } = data;
    const { openGrant, setSuspendTarget, setReactivateTarget, setRevokeTarget } = useUsersDialogs();

    return (
        <div className="space-y-6 pb-12 text-foreground">
            <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users &amp; moderators</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Grant review access to an existing user. Grants are idempotent — duplicates are rejected.
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{users.length}</span> Total Users
                    <span aria-hidden>·</span>
                    <span className="font-bold text-foreground">{moderators.length}</span> Moderators
                </div>
            </header>

            {loadError ? (
                <ErrorMessage message={loadError} onRetry={() => void refresh()} variant="subtle" />
            ) : null}

            <UsersModerators
                moderators={moderators}
                moderatorIds={moderatorIds}
                actingId={actingId}
                onGrant={openGrant}
                onSuspend={setSuspendTarget}
                onReactivate={setReactivateTarget}
                onRevoke={setRevokeTarget}
            />

            <UsersAudit audit={audit} />

            <UsersTable
                users={users}
                moderatorIds={moderatorIds}
                actingId={actingId}
                onSuspend={setSuspendTarget}
                onReactivate={setReactivateTarget}
            />

            <UsersDialogs
                actingId={actingId}
                grantCandidates={grantCandidates}
                grant={grant}
                revoke={revoke}
                suspend={suspend}
                reactivate={reactivate}
            />
        </div>
    );
}
