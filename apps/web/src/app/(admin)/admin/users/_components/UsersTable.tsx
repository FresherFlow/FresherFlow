'use client';

import { useMemo } from 'react';
import type { DirectoryUser } from '@/features/admin/moderators/moderationContract';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { DataGrid, type DataGridColumn } from '@/ui/data-grid/DataGrid';
import { STICKY_AFTER_SELECT } from '@/ui/data-grid/sticky';
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
    /** Rows matching the directory query; may exceed the loaded page. */
    total?: number;
    /** Server-backed filters, search and paging (see `useModerators`). */
    searchValue: string;
    onSearchChange: (value: string) => void;
    statusValue: string;
    onStatusChange: (value: string) => void;
    roleValue: string;
    onRoleChange: (value: string) => void;
    pageIndex: number;
    pageCount: number;
    pageSize: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    isLoading?: boolean;
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
 *
 * `variant="bare"` picks the shadcn-admin `users-table.tsx` shape: toolbar
 * outside the table, then ONE `rounded-md border` div, then pagination pinned
 * with `mt-auto`. The page hands down a bounded height, so the grid owns the
 * scroll and its own footer stays reachable — and no `Card` renders, so there
 * is no box inside a box.
 */
export default function UsersTable({
    users,
    total,
    searchValue,
    onSearchChange,
    statusValue,
    onStatusChange,
    roleValue,
    onRoleChange,
    pageIndex,
    pageCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
    moderatorIds,
    actingId,
    onSuspend,
    onReactivate,
    onBulkSuspend,
    onBulkReactivate,
}: UsersTableProps) {
    const columns = useMemo<DataGridColumn<DirectoryUser>[]>(
        () => buildColumns({ moderatorIds, actingId, onSuspend, onReactivate }),
        [moderatorIds, actingId, onSuspend, onReactivate]
    );

    return (
        <DataGrid<DirectoryUser>
            // Every filter, the search and the page live in the API, so the
            // grid never holds a truncated copy of the directory.
            data={users}
            columns={columns}
            getRowId={(row) => row.id}
            title="Registered users"
            count={total ?? users.length}
            countLabel="users"
            isLoading={isLoading}
            enableSelection
            searchPlaceholder="Search name, email or username…"
            statusValue={statusValue || ALL}
            statusOptions={STATUS_OPTIONS}
            onStatusChange={(value) => onStatusChange(value === ALL ? '' : value)}
            roleValue={roleValue || ALL}
            roleOptions={ROLE_OPTIONS}
            onRoleChange={(value) => onRoleChange(value === ALL ? '' : value)}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onClear={() => {
                onStatusChange('');
                onRoleChange('');
                onSearchChange('');
            }}
            serverPagination={{
                pageIndex,
                pageCount,
                onPageChange,
                pageSize,
                onPageSizeChange,
                pageSizeOptions: [10, 20, 50, 100],
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
            /* The bare root already carries `flex min-h-0 flex-1 flex-col`, so
                the grid fills the bounded wrapper the page passes down without a
                redundant className. */
            variant="bare"
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
                const name = user.fullName;
                return (
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-muted text-sm font-bold uppercase text-primary">
                            {(name || user.email || user.username || 'U')[0]}
                        </div>
                        {/* Bounded on mobile so a long name or email truncates
                            instead of stretching the row: this column is the
                            pinned one, and an unbounded `white-space: nowrap`
                            child widened the whole table until the other
                            columns fell off the screen. Full width from `sm`. */}
                        <div className="min-w-0 max-w-40 sm:max-w-56">
                            <div className="truncate font-semibold tracking-tight text-foreground" title={name ?? undefined}>
                                {name || (
                                    <span className="italic text-muted-foreground">No Name</span>
                                )}
                                {moderatorIds.has(user.id) ? (
                                    <Badge variant="default" className="ml-2">
                                        Moderator
                                    </Badge>
                                ) : null}
                            </div>
                            <div className="truncate text-sm text-muted-foreground" title={user.email ?? undefined}>
                                {user.email || 'No email provided'}
                            </div>
                        </div>
                    </div>
                );
            },
            // Pinned so identity stays readable while the other columns scroll.
            // The offset is the 40px select-all column, shared from ./sticky so
            // the two cannot drift apart.
            meta: { sticky: 'left', stickyOffsetClass: STICKY_AFTER_SELECT },
        },
        {
            id: 'username',
            header: 'Username',
            accessorFn: (row) => row.username || '',
            cell: ({ row }) =>
                row.original.username ? (
                    <span
                        className="block max-w-40 truncate font-mono text-sm font-medium sm:max-w-56"
                        title={`@${row.original.username}`}
                    >
                        @{row.original.username}
                    </span>
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
