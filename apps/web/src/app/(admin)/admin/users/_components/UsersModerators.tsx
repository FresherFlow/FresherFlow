import type { ModeratorListEntry } from '@/features/admin/moderators/moderationContract';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { displayName, formatAssignedAt, statusBadgeVariant } from './userDisplay';

interface UsersModeratorsProps {
    moderators: ModeratorListEntry[];
    moderatorIds: Set<string>;
    actingId: string | null;
    onGrant: () => void;
    onSuspend: (target: { id: string; name: string }) => void;
    onReactivate: (target: { id: string; name: string }) => void;
    onRevoke: (target: ModeratorListEntry) => void;
}

export default function UsersModerators({
    moderators,
    actingId,
    onGrant,
    onSuspend,
    onReactivate,
    onRevoke,
}: UsersModeratorsProps) {
    return (
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
                <Button size="sm" onClick={onGrant}>
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
                        <Button size="sm" onClick={onGrant}>
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
                                {/* A div, not a p: Badge renders a <div>, which is
                                    invalid inside a <p> and triggers a hydration error. */}
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant={statusBadgeVariant(moderator.status)}>
                                        {moderator.status}
                                    </Badge>
                                    <span>since {formatAssignedAt(moderator.assignedAt)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {moderator.status === 'ACTIVE' ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={actingId === moderator.id}
                                        onClick={() =>
                                            onSuspend({ id: moderator.id, name: displayName(moderator) })
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
                                            onReactivate({ id: moderator.id, name: displayName(moderator) })
                                        }
                                    >
                                        Reactivate
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={actingId === moderator.id}
                                    onClick={() => onRevoke(moderator)}
                                >
                                    Revoke
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
