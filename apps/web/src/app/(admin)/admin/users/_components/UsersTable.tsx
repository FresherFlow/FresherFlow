import type { DirectoryUser } from '@/features/admin/moderators/moderationContract';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { stickyCellClass, stickyHeaderCellClass } from '@/ui/data-grid/sticky';
import { displayName, formatAssignedAt, statusBadgeVariant } from './userDisplay';

interface UsersTableProps {
    users: DirectoryUser[];
    moderatorIds: Set<string>;
    actingId: string | null;
    onSuspend: (target: { id: string; name: string }) => void;
    onReactivate: (target: { id: string; name: string }) => void;
}

export default function UsersTable({ users, moderatorIds, actingId, onSuspend, onReactivate }: UsersTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* Single responsive table: the profile column pins on mobile
                while the rest scrolls horizontally (see ui/data-grid/sticky). */}
            <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className={stickyHeaderCellClass()}>User Profile</TableHead>
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
                                    <TableCell className={stickyCellClass()}>
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
                                                    onReactivate({
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
                                                    onSuspend({ id: user.id, name: displayName(user) })
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

        </div>
    );
}
