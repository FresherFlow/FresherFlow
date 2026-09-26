'use client';

import { useState } from 'react';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { useModerators } from '@/features/admin/moderators/useModerators';
import type { DirectoryUser, ModeratorListEntry } from '@/features/admin/moderators/moderationContract';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import { AlertDialog } from '@/ui/AlertDialog';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';

function statusBadgeVariant(status?: string): 'success' | 'destructive' | 'warning' {
    if (status === 'SUSPENDED' || status === 'DEACTIVATED') return 'destructive';
    return 'success';
}

function formatAssignedAt(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayName(e: { fullName?: string | null; email?: string | null; id: string }): string {
    return e.fullName || e.email || e.id;
}

export default function AdminUsersPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const {
        moderators,
        users,
        audit,
        loading,
        loadError,
        actingId,
        moderatorIds,
        grantCandidates,
        refresh,
        grant,
        revoke,
        suspend,
        reactivate,
    } = useModerators(isAuthenticated);

    const [grantOpen, setGrantOpen] = useState(false);
    const [grantQuery, setGrantQuery] = useState('');
    const [grantTarget, setGrantTarget] = useState<DirectoryUser | null>(null);
    const [grantReason, setGrantReason] = useState('');
    const [revokeTarget, setRevokeTarget] = useState<ModeratorListEntry | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string } | null>(null);
    const [reactivateTarget, setReactivateTarget] = useState<{ id: string; name: string } | null>(null);

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

    const candidates = grantCandidates(grantQuery);

    function openGrant() {
        setGrantQuery('');
        setGrantTarget(null);
        setGrantReason('');
        setGrantOpen(true);
    }

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

            <section
                aria-label="Moderators"
                className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold tracking-tight text-foreground">Moderators</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Who holds review access, their account status, and when the role was assigned.
                        </p>
                    </div>
                    <Button size="sm" onClick={openGrant}>
                        Grant moderator
                    </Button>
                </div>

                {moderators.length === 0 ? (
                    <EmptyState
                        icon="inbox"
                        size="md"
                        title="No moderators yet"
                        description="Grant the Moderator role to an existing user to unlock review queues."
                        action={
                            <Button size="sm" onClick={openGrant}>
                                Grant moderator
                            </Button>
                        }
                    />
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/60">
                        {moderators.map((moderator) => (
                            <li
                                key={moderator.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {displayName(moderator)}
                                        {moderator.username ? (
                                            <span className="text-muted-foreground"> @{moderator.username}</span>
                                        ) : null}
                                    </p>
                                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant={statusBadgeVariant(moderator.status)}>
                                            {moderator.status}
                                        </Badge>
                                        <span>since {formatAssignedAt(moderator.assignedAt)}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {moderator.status === 'ACTIVE' ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={actingId === moderator.id}
                                            onClick={() =>
                                                setSuspendTarget({ id: moderator.id, name: displayName(moderator) })
                                            }
                                        >
                                            Suspend
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={actingId === moderator.id}
                                            onClick={() =>
                                                setReactivateTarget({ id: moderator.id, name: displayName(moderator) })
                                            }
                                        >
                                            Reactivate
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={actingId === moderator.id}
                                        onClick={() => setRevokeTarget(moderator)}
                                    >
                                        Revoke
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section
                aria-label="Recent moderator audit"
                className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
            >
                <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Recent moderator audit</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Who did what to which object, when, and why. Full history lives under Audit log.
                    </p>
                </div>
                {audit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No audit entries yet. Grants, revocations, suspensions, and reactivations will appear here.
                    </p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/60">
                        {audit.slice(0, 8).map((entry, i) => (
                            <li key={`${entry.at}-${entry.action}-${entry.object}-${i}`} className="px-3 py-2">
                                <p className="text-sm text-foreground">
                                    <span className="font-medium">{entry.who}</span>{' '}
                                    <Badge variant="secondary">{entry.action}</Badge>
                                </p>
                                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                                    {entry.object} · {formatAssignedAt(entry.at)}
                                    {entry.reason ? ` · ${entry.reason}` : ''}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="hidden overflow-x-auto md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User Profile</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Joined At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <p className="py-6 font-medium text-foreground">No registered users found.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold uppercase text-primary">
                                                    {(user.fullName || user.email || user.username || 'U')[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold tracking-tight text-foreground">
                                                        {user.fullName || (
                                                            <span className="italic text-muted-foreground">No Name</span>
                                                        )}
                                                        {moderatorIds.has(user.id) ? (
                                                            <Badge variant="default" className="ml-2">
                                                                Moderator
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        {user.email || 'No email provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.username ? (
                                                <span className="font-mono text-sm font-medium">@{user.username}</span>
                                            ) : (
                                                <span className="italic text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusBadgeVariant(user.status)}>
                                                {user.status || 'ACTIVE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            {user.createdAt ? formatAssignedAt(user.createdAt) : '—'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-right">
                                            {user.status === 'SUSPENDED' || user.status === 'DEACTIVATED' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actingId === user.id}
                                                    onClick={() =>
                                                        setReactivateTarget({
                                                            id: user.id,
                                                            name: displayName(user),
                                                        })
                                                    }
                                                >
                                                    Reactivate
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actingId === user.id}
                                                    onClick={() =>
                                                        setSuspendTarget({ id: user.id, name: displayName(user) })
                                                    }
                                                >
                                                    Suspend
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="grid grid-cols-1 divide-y divide-border md:hidden">
                    {users.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="font-medium text-foreground">No registered users found.</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="p-4">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold uppercase text-primary">
                                        {(user.fullName || user.email || user.username || 'U')[0]}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold tracking-tight text-foreground">
                                            {user.fullName || (
                                                <span className="italic text-muted-foreground">No Name</span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {user.email || 'No email provided'}
                                        </div>
                                    </div>
                                    <Badge variant={statusBadgeVariant(user.status)}>{user.status || 'ACTIVE'}</Badge>
                                </div>
                                {user.status === 'SUSPENDED' || user.status === 'DEACTIVATED' ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        disabled={actingId === user.id}
                                        onClick={() => setReactivateTarget({ id: user.id, name: displayName(user) })}
                                    >
                                        Reactivate
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        disabled={actingId === user.id}
                                        onClick={() => setSuspendTarget({ id: user.id, name: displayName(user) })}
                                    >
                                        Suspend
                                    </Button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Grant flow: select an existing user; current moderators are excluded upstream. */}
            <Dialog
                open={grantOpen}
                onOpenChange={(open) => {
                    setGrantOpen(open);
                    if (!open) {
                        setGrantTarget(null);
                        setGrantReason('');
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Grant moderator access</DialogTitle>
                        <DialogDescription>
                            Select an existing user. They keep the normal login and gain review queues — never admin
                            management or settings.
                        </DialogDescription>
                    </DialogHeader>
                    {!grantTarget ? (
                        <div className="space-y-2">
                            <Input
                                type="search"
                                aria-label="Search registered users"
                                value={grantQuery}
                                onChange={(e) => setGrantQuery(e.target.value)}
                                placeholder="Search by email, username, or name…"
                            />
                            {grantQuery.trim() && candidates.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No eligible users match. Current moderators are excluded.
                                </p>
                            ) : null}
                            {candidates.length > 0 ? (
                                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/60">
                                    {candidates.map((candidate) => (
                                        <li
                                            key={candidate.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {displayName(candidate)}
                                                    {candidate.username ? (
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            @{candidate.username}
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {candidate.email || 'No email'}
                                                </p>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => setGrantTarget(candidate)}>
                                                Select
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-foreground">
                                Granting <span className="font-semibold">{displayName(grantTarget)}</span>
                                {grantTarget.username ? (
                                    <span className="text-muted-foreground"> @{grantTarget.username}</span>
                                ) : null}
                            </p>
                            <Textarea
                                aria-label="Grant reason (optional)"
                                value={grantReason}
                                onChange={(e) => setGrantReason(e.target.value)}
                                placeholder="Reason for the audit log (optional)…"
                                rows={3}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        {grantTarget ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setGrantTarget(null)}>
                                    Back
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={actingId === grantTarget.id}
                                    onClick={() => {
                                        void grant(grantTarget.id, grantReason.trim() || undefined).then(() =>
                                            setGrantOpen(false),
                                        );
                                    }}
                                >
                                    Confirm grant
                                </Button>
                            </>
                        ) : (
                            <Button variant="ghost" size="sm" onClick={() => setGrantOpen(false)}>
                                Cancel
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke flow: explicit confirm; the account stays active. */}
            <AlertDialog
                show={revokeTarget !== null}
                title="Remove moderator access?"
                message={
                    revokeTarget
                        ? `${displayName(revokeTarget)} loses review queues immediately. Their account stays active.`
                        : ''
                }
                type="warning"
                confirmText="Remove access"
                onCancel={() => setRevokeTarget(null)}
                onConfirm={() => {
                    const id = revokeTarget?.id;
                    setRevokeTarget(null);
                    if (id) void revoke(id);
                }}
            />

            {/* Suspend flow: reason is required for the audit trail. */}
            <AlertDialog
                show={suspendTarget !== null}
                title="Suspend user?"
                message={
                    suspendTarget
                        ? `${suspendTarget.name} loses protected access, including moderator queues, until reactivated.`
                        : ''
                }
                type="danger"
                confirmText="Suspend user"
                requireReason
                reasonPlaceholder="e.g. Spam wave in community reports…"
                onCancel={() => setSuspendTarget(null)}
                onConfirm={(reason) => {
                    const target = suspendTarget;
                    setSuspendTarget(null);
                    if (target) void suspend(target.id, reason?.trim() || 'Suspended by admin');
                }}
            />

            {/* Reactivate flow: explicit confirm. */}
            <AlertDialog
                show={reactivateTarget !== null}
                title="Reactivate user?"
                message={
                    reactivateTarget ? `${reactivateTarget.name} regains protected access immediately.` : ''
                }
                type="warning"
                confirmText="Reactivate"
                onCancel={() => setReactivateTarget(null)}
                onConfirm={() => {
                    const target = reactivateTarget;
                    setReactivateTarget(null);
                    if (target) void reactivate(target.id);
                }}
            />
        </div>
    );
}
