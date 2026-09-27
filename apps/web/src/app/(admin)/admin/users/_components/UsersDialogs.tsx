'use client';

import { useModerators } from '@/features/admin/moderators/useModerators';
import { AlertDialog } from '@/ui/AlertDialog';
import { Button } from '@/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { useUsersDialogs } from './UsersProvider';
import { displayName } from './userDisplay';

type UsersDialogsProps = Pick<
    ReturnType<typeof useModerators>,
    'actingId' | 'bulkPending' | 'grantCandidates' | 'grant' | 'revoke' | 'suspend' | 'reactivate' | 'suspendMany' | 'reactivateMany'
>;

export default function UsersDialogs({
    actingId,
    bulkPending,
    grantCandidates,
    grant,
    revoke,
    suspend,
    reactivate,
    suspendMany,
    reactivateMany,
}: UsersDialogsProps) {
    const {
        grantOpen,
        setGrantOpen,
        grantQuery,
        setGrantQuery,
        grantTarget,
        setGrantTarget,
        grantReason,
        setGrantReason,
        revokeTarget,
        setRevokeTarget,
        suspendTarget,
        setSuspendTarget,
        reactivateTarget,
        setReactivateTarget,
        bulkSuspendTargets,
        setBulkSuspendTargets,
        bulkReactivateTargets,
        setBulkReactivateTargets,
    } = useUsersDialogs();

    const candidates = grantCandidates(grantQuery);

    return (
        <>
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

            {/* Bulk suspend: one confirm, one reason shared across the audit rows. */}
            <AlertDialog
                show={(bulkSuspendTargets?.length ?? 0) > 0}
                title={
                    bulkSuspendTargets && bulkSuspendTargets.length > 0
                        ? `Suspend ${bulkSuspendTargets.length} user${bulkSuspendTargets.length === 1 ? '' : 's'}?`
                        : 'Suspend users?'
                }
                message={
                    bulkSuspendTargets && bulkSuspendTargets.length > 0
                        ? `${bulkSuspendTargets
                              .slice(0, 5)
                              .map((t) => t.name)
                              .join(', ')}${
                              bulkSuspendTargets.length > 5
                                  ? ` and ${bulkSuspendTargets.length - 5} more`
                                  : ''
                          } lose protected access until reactivated.`
                        : ''
                }
                type="danger"
                confirmText={
                    bulkPending
                        ? 'Working…'
                        : bulkSuspendTargets && bulkSuspendTargets.length > 0
                          ? `Suspend ${bulkSuspendTargets.length}`
                          : 'Suspend'
                }
                requireReason
                reasonPlaceholder="e.g. Spam wave in community reports…"
                onCancel={() => {
                    if (!bulkPending) setBulkSuspendTargets(null);
                }}
                onConfirm={(reason) => {
                    const targets = bulkSuspendTargets;
                    if (!targets || targets.length === 0 || bulkPending) return;
                    setBulkSuspendTargets(null);
                    void suspendMany(
                        targets.map((t) => t.id),
                        reason?.trim() || 'Suspended by admin (bulk)',
                    );
                }}
            />

            {/* Bulk reactivate: one confirm, no reason needed. */}
            <AlertDialog
                show={(bulkReactivateTargets?.length ?? 0) > 0}
                title={
                    bulkReactivateTargets && bulkReactivateTargets.length > 0
                        ? `Reactivate ${bulkReactivateTargets.length} user${bulkReactivateTargets.length === 1 ? '' : 's'}?`
                        : 'Reactivate users?'
                }
                message={
                    bulkReactivateTargets && bulkReactivateTargets.length > 0
                        ? `${bulkReactivateTargets
                              .slice(0, 5)
                              .map((t) => t.name)
                              .join(', ')}${
                              bulkReactivateTargets.length > 5
                                  ? ` and ${bulkReactivateTargets.length - 5} more`
                                  : ''
                          } regain protected access immediately.`
                        : ''
                }
                type="warning"
                confirmText={
                    bulkPending
                        ? 'Working…'
                        : bulkReactivateTargets && bulkReactivateTargets.length > 0
                          ? `Reactivate ${bulkReactivateTargets.length}`
                          : 'Reactivate'
                }
                onCancel={() => {
                    if (!bulkPending) setBulkReactivateTargets(null);
                }}
                onConfirm={() => {
                    const targets = bulkReactivateTargets;
                    if (!targets || targets.length === 0 || bulkPending) return;
                    setBulkReactivateTargets(null);
                    void reactivateMany(targets.map((t) => t.id));
                }}
            />
        </>
    );
}
