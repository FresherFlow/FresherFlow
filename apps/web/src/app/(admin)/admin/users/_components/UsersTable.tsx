'use client';

import { useMemo, useState } from 'react';
import type { DirectoryUser } from '@/features/admin/moderators/moderationContract';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { DataGrid, type DataGridColumn } from '@/ui/data-grid/DataGrid';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import { selectionColumn } from '@/features/admin/discovery/selectionColumn';
import { BanIcon, UserCheckIcon } from 'lucide-react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { displayName, formatAssignedAt, statusBadgeVariant } from './userDisplay';

interface UsersTableProps {
    users: DirectoryUser[];
    moderatorIds: Set<string>;
    actingId: string | null;
    onSuspend: (target: { id: string; name: string }) => void;
    onReactivate: (target: { id: string; name: string }) => void;
    onBulkSuspend: (targets: { id: string; name: string }[]) => void;
    onBulkReactivate: (targets: { id: string; name: string }[]) => void;
}

const ALL = 'ALL';

const STATUS_OPTIONS = [
    { value: ALL, label: 'All status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'DEACTIVATED', label: 'Deactivated' },
];

const ROLE_OPTIONS = [
    { value: ALL, label: 'All roles' },
    { value: 'MODERATOR', label: 'Moderators' },
    { value: 'USER', label: 'Regular users' },
];

/**
 * Directory of registered users, built on the shared `DataGrid` so it gets the
 * same behaviour as every other admin queue: search, sortable columns,
 * pagination, row selection and the floating bulk bar.
 *
 * The first column pins on mobile (via `meta.sticky`) while the rest scroll
 * horizontally, which is the pattern the rest of the admin uses — see
 * `ui/data-grid/sticky`.
 */
export default function UsersTable({
    users,
    moderatorIds,
    actingId,
    onSuspend,
    onReactivate,
    onBulkSuspend,
    onBulkReactivate,
}: UsersTableProps) {
    const [statusFilter, setStatusFilter] = useState(ALL);
    const [roleFilter, setRoleFilter] = useState(ALL);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');

    // The grid filters only the rows it holds, and this list is the full
    // directory, so the status facet is applied here rather than server-side.
    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return users.filter((user) => {
            if (statusFilter !== ALL && (user.status ?? 'ACTIVE') !== statusFilter) return false;
            if (roleFilter === 'MODERATOR' && !moderatorIds.has(user.id)) return false;
            if (roleFilter === 'USER' && moderatorIds.has(user.id)) return false;
            if (!term) return true;
            return [user.fullName, user.email, user.username]
                .some((field) => field?.toLowerCase().includes(term));
        });
    }, [users, statusFilter, roleFilter, moderatorIds, query]);

    const columns = useMemo<DataGridColumn<DirectoryUser>[]>(
        () => buildColumns({ moderatorIds, actingId, onSuspend, onReactivate }),
        [moderatorIds, actingId, onSuspend, onReactivate]
    );

    return (
        <DataGrid<DirectoryUser>
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            title="Registered users"
            count={users.length}
            countLabel="users"
            enableSelection
            searchPlaceholder="Search name, email or username…"
            statusValue={statusFilter}
            statusOptions={STATUS_OPTIONS}
            onStatusChange={(value) => setStatusFilter(value === ALL ? '' : value)}
            roleValue={roleFilter}
            roleOptions={ROLE_OPTIONS}
            onRoleChange={(value) => setRoleFilter(value === ALL ? '' : value)}
            searchValue={search}
            onSearchChange={(value) => {
                setSearch(value);
                setQuery(value);
            }}
            onClear={() => {
                setStatusFilter(ALL);
                setRoleFilter(ALL);
                setSearch('');
                setQuery('');
            }}
            defaultPageSize={20}
            showViewOptions
            bulkActions={({ selectedRows }) => (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Suspend ${selectedRows.length} selected users`}
                        title={`Suspend ${selectedRows.length} selected users`}
                        onClick={() => {
                            onBulkSuspend(
                                selectedRows.map((user) => ({ id: user.id, name: displayName(user) })),
                            );
                        }}
                    >
                        <BanIcon className="size-4" />
                        Suspend ({selectedRows.length})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Reactivate ${selectedRows.length} selected users`}
                        title={`Reactivate ${selectedRows.length} selected users`}
                        onClick={() => {
                            onBulkReactivate(
                                selectedRows.map((user) => ({ id: user.id, name: displayName(user) })),
                            );
                        }}
                    >
                        <UserCheckIcon className="size-4" />
                        Reactivate ({selectedRows.length})
                    </Button>
                </>
            )}
            bulkBarEntityName="user"
            className="min-h-0 flex-1"
        />
    );
}

function buildColumns({
    moderatorIds,
    actingId,
    onSuspend,
    onReactivate,
}: {
    moderatorIds: Set<string>;
    actingId: string | null;
    onSuspend: UsersTableProps['onSuspend'];
    onReactivate: UsersTableProps['onReactivate'];
}): DataGridColumn<DirectoryUser>[] {
    return [
        selectionColumn<DirectoryUser>(),
        {
            id: 'profile',
            header: 'User Profile',
            accessorFn: (row) => row.fullName || row.email || row.username || row.id,
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold uppercase text-primary">
                            {(user.fullName || user.email || user.username || 'U')[0]}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-semibold tracking-tight text-foreground">
                                {user.fullName || (
                                    <span className="italic text-muted-foreground">No Name</span>
                                )}
                                {moderatorIds.has(user.id) ? (
                                    <Badge variant="default" className="ml-2">
                                        Moderator
                                    </Badge>
                                ) : null}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {user.email || 'No email provided'}
                            </div>
                        </div>
                    </div>
                );
            },
            // Pinned so identity stays readable while the other columns scroll.
            meta: { sticky: 'left', stickyOffsetClass: 'max-md:left-10' },
        },
        {
            id: 'username',
            header: 'Username',
            accessorFn: (row) => row.username || '',
            cell: ({ row }) =>
                row.original.username ? (
                    <span className="font-mono text-sm font-medium">@{row.original.username}</span>
                ) : (
                    <span className="italic text-muted-foreground">None</span>
                ),
        },
        {
            id: 'status',
            header: 'Status',
            accessorFn: (row) => row.status || 'ACTIVE',
            cell: ({ row }) => (
                <Badge variant={statusBadgeVariant(row.original.status)}>
                    {row.original.status || 'ACTIVE'}
                </Badge>
            ),
        },
        {
            id: 'createdAt',
            header: 'Joined At',
            accessorFn: (row) => row.createdAt || '',
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-right">
                    {row.original.createdAt ? formatAssignedAt(row.original.createdAt) : '—'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;
                const isSuspended = user.status === 'SUSPENDED' || user.status === 'DEACTIVATED';
                const target = { id: user.id, name: displayName(user) };
                return (
                    <div className="flex justify-end">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Actions for ${displayName(user)}`}
                                >
                                    <EllipsisHorizontalIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    disabled={actingId === user.id}
                                    onClick={() => {
                                        if (isSuspended) onReactivate(target);
                                        else onSuspend(target);
                                    }}
                                >
                                    {isSuspended ? (
                                        <UserCheckIcon className="size-4" />
                                    ) : (
                                        <BanIcon className="size-4" />
                                    )}
                                    {isSuspended ? 'Reactivate' : 'Suspend'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}
