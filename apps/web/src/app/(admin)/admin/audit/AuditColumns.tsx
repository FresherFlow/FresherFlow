'use client';

import { Badge } from '@/ui/Badge';
import type { DataGridColumn } from '@/ui/data-grid/DataGrid';

/**
 * Column + action-label definitions for `/admin/audit`.
 *
 * Route-private (nothing outside `admin/audit` imports it), so the audit page
 * owns its own vocabulary — the action names are the audit API's, not a
 * product-wide taxonomy.
 */

/** One row of `GET /api/admin/audit` (see `apps/api/src/routes/admin/audit.ts`). */
export interface AuditEntry {
    id: string;
    action: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
    user: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
}

type ActionBadgeVariant =
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'muted'
    | 'success'
    | 'warning';

/**
 * Display name and tone for every action the audit endpoint can record.
 *
 * Keys mirror the API `ACTIONS` enum; an unrecognised value still renders as an
 * `outline` chip with its raw name, so a newly added action shows up instead of
 * going blank. The page deliberately does NOT restate the "grants audit as
 * CREATE, revocations as DELETE" implementation note — that is an API detail,
 * not something an operator reading the log needs.
 */
const ACTION_META: Record<string, { label: string; variant: ActionBadgeVariant }> = {
    CREATE: { label: 'Create', variant: 'success' },
    UPDATE: { label: 'Update', variant: 'default' },
    DELETE: { label: 'Delete', variant: 'destructive' },
    EXPIRE: { label: 'Expire', variant: 'warning' },
    BULK_ACTION: { label: 'Bulk action', variant: 'secondary' },
    EXPORT: { label: 'Export', variant: 'muted' },
    REJECT: { label: 'Reject', variant: 'warning' },
    SPAM: { label: 'Spam', variant: 'destructive' },
};

/** Sentinel for "no action facet", matching the other admin grids' toolbar convention. */
export const ALL_ACTIONS = 'ALL';

/** Facet options for the DataGrid's built-in toolbar select, derived from `ACTION_META`. */
export const ACTION_OPTIONS = [
    { value: ALL_ACTIONS, label: 'All actions' },
    ...Object.entries(ACTION_META).map(([value, meta]) => ({ value, label: meta.label })),
];

/**
 * Actor identity, split into a primary line (handle when there is one) and a
 * secondary line (the next identifier we have). A deleted actor still renders
 * as its id rather than a dash, because "who" is the point of the column.
 */
function actorIdentity(entry: AuditEntry): { primary: string; secondary: string | null } {
    const user = entry.user;
    if (!user) return { primary: 'Unknown actor', secondary: null };
    const primary = user.username ? `@${user.username}` : (user.fullName ?? user.email ?? user.id);
    const secondary =
        [user.fullName, user.email, user.id].find(
            (value): value is string => Boolean(value) && value !== primary,
        ) ?? null;
    return { primary, secondary };
}

function formatWhen(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * The audit grid's columns.
 *
 * Every column is sortable — `DataGrid` owns the header control, so a def only
 * needs an `id` and an `accessorKey`/`accessorFn`. There is no "Result" column:
 * the audit endpoint returns no result field, and a column of dashes is worse
 * than no column. Nothing here is `enableHiding: false`, so the grid's Columns
 * toggle can hide any of them.
 *
 * There is no select column either: the audit log is append-only, there is no
 * bulk action to run against a selection, and the page therefore renders the
 * grid with `enableSelection={false}` rather than shipping dead checkboxes.
 */
export function buildAuditColumns(): DataGridColumn<AuditEntry>[] {
    return [
        {
            id: 'actor',
            header: 'Who',
            accessorFn: (row) => actorIdentity(row).primary,
            cell: ({ row }) => {
                const { primary, secondary } = actorIdentity(row.original);
                return (
                    /* Bounded on mobile: this is the pinned column, so an
                       unbounded nowrap child would widen the table until the
                       rest of the row scrolled off screen. */
                    <div className="flex min-w-0 max-w-40 flex-col sm:max-w-56">
                        <span className="truncate font-semibold text-foreground" title={primary}>
                            {primary}
                        </span>
                        {secondary ? (
                            <span className="truncate text-sm text-muted-foreground" title={secondary}>
                                {secondary}
                            </span>
                        ) : null}
                    </div>
                );
            },
            // Pinned on mobile so "who did this" stays readable while the rest of
            // the row scrolls underneath (see `ui/data-grid/sticky`). The audit
            // grid runs with `enableSelection={false}`, so there is no
            // select-all column to offset past and the cell starts at 0.
            meta: { sticky: 'left' },
        },
        {
            id: 'action',
            header: 'Action',
            accessorFn: (row) => row.action,
            cell: ({ row }) => {
                const meta = ACTION_META[row.original.action];
                return (
                    <Badge variant={meta?.variant ?? 'outline'} size="sm">
                        {meta?.label ?? row.original.action}
                    </Badge>
                );
            },
        },
        {
            id: 'targetId',
            header: 'Object',
            accessorFn: (row) => row.targetId,
            cell: ({ row }) => (
                <span
                    className="block max-w-40 truncate font-mono text-sm sm:max-w-56"
                    title={row.original.targetId}
                >
                    {row.original.targetId}
                </span>
            ),
        },
        {
            id: 'createdAt',
            header: 'When',
            // Numeric accessor so the grid sorts by instant; a string accessor
            // would sort ISO timestamps lexicographically, which only happens to
            // agree for same-format UTC strings.
            accessorFn: (row) => {
                const time = Date.parse(row.createdAt);
                return Number.isNaN(time) ? 0 : time;
            },
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatWhen(row.original.createdAt)}
                </span>
            ),
        },
        {
            id: 'reason',
            header: 'Reason',
            accessorFn: (row) => row.reason ?? '',
            cell: ({ row }) =>
                row.original.reason ? (
                    <span
                        className="block max-w-40 truncate text-muted-foreground sm:max-w-64"
                        title={row.original.reason}
                    >
                        {row.original.reason}
                    </span>
                ) : (
                    <span className="italic text-muted-foreground">None</span>
                ),
        },
    ];
}
