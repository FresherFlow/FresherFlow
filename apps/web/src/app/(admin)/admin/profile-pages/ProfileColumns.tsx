'use client';

import { Badge } from '@/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import type { DataGridColumn } from '@/ui/data-grid/DataGrid';

/**
 * Column + status vocabulary for `/admin/profile-pages`.
 *
 * Route-private (nothing outside `admin/profile-pages` imports it), so the page
 * owns its own labels: the values come from the admin profiles endpoints
 * (`apps/api/src/routes/admin/profiles.ts`) and are not a product-wide
 * taxonomy.
 */

/** One row of `GET /api/admin/profiles/intro-requests`. */
export interface IntroRequest {
    id: string;
    message: string | null;
    status: 'PENDING' | 'CONTACTED' | 'ARCHIVED';
    createdAt: string;
    candidate: { id: string; fullName: string | null; username: string | null; email: string | null };
    recruiter: { id: string; fullName: string | null; email: string | null } | null;
}

/** One row of `GET /api/admin/profiles` (already carries the derived page state). */
export interface AdminProfile {
    userId: string;
    headline: string | null;
    gradCourse: string | null;
    gradYear: number | null;
    skills: string[];
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    openToRecruiters: boolean;
    completionPercentage: number;
    views: number;
    profilePublishedAt: string | null;
    /** Derived from publication + the boost window. Every state except `draft` is reachable
     *  by URL — `unboosted` means a live page that is simply no longer promoted. */
    pageState: 'draft' | 'live' | 'lapsing' | 'unboosted';
    user: { id: string; fullName: string | null; username: string | null; email: string | null; status: string };
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'muted' | 'success' | 'warning';

/**
 * Display name + tone for every intro-request status. Keys mirror the API enum;
 * an unrecognised value still renders as an `outline` chip with its raw name so
 * a newly added status shows up instead of going blank.
 */
const INTRO_STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    CONTACTED: { label: 'Contacted', variant: 'success' },
    ARCHIVED: { label: 'Archived', variant: 'outline' },
};

/** The per-row status control is a `Select`, so its options carry the same labels. */
export const INTRO_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'ARCHIVED', label: 'Archived' },
];

/** Options for the intros tab's status facet, derived from `INTRO_STATUS_META`. */
export const ALL_INTRO_STATUSES = 'ALL';
export const INTRO_STATUS_FILTER_OPTIONS = [
    { value: ALL_INTRO_STATUSES, label: 'All statuses' },
    ...Object.entries(INTRO_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
];

export function introStatusBadge(status: string): { label: string; variant: BadgeVariant } {
    return INTRO_STATUS_META[status] ?? { label: status, variant: 'outline' };
}

/**
 * Display name + tone for the derived page state. `pageState` is the API's
 * publication + boost verdict, not a stored column, so the four labels are the whole
 * vocabulary and there is no unknown-value branch to write.
 *
 * "Live" here means reachable. Only `draft` is dark; `unboosted` is a working page that
 * has fallen out of the recruiter directory, which is the state moderators should treat
 * as healthy rather than as a fault.
 */
const PAGE_STATE_META: Record<AdminProfile['pageState'], { label: string; variant: BadgeVariant }> = {
    live: { label: 'Live · boosted', variant: 'default' },
    lapsing: { label: 'Boost lapsing', variant: 'secondary' },
    unboosted: { label: 'Live · no boost', variant: 'outline' },
    draft: { label: 'Never published', variant: 'muted' },
};

/** Sentinel for "no page-state facet", matching the other admin grids' toolbar convention. */
export const ALL_PAGE_STATES = 'ALL';
export const PAGE_STATE_OPTIONS = [
    { value: ALL_PAGE_STATES, label: 'All page states' },
    { value: 'live', label: 'Live · boosted' },
    { value: 'lapsing', label: 'Boost lapsing' },
    { value: 'unboosted', label: 'Live · no boost' },
    { value: 'draft', label: 'Never published' },
];

export function pageStateBadge(state: AdminProfile['pageState']): { label: string; variant: BadgeVariant } {
    return PAGE_STATE_META[state] ?? { label: state, variant: 'outline' };
}

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Public' },
    { value: 'UNLISTED', label: 'Unlisted' },
    { value: 'PRIVATE', label: 'Private' },
];

/** Best available human name for a profile owner. */
export function profileOwnerName(profile: AdminProfile): string {
    return profile.user.fullName || profile.user.username || profile.user.email || profile.userId;
}

/**
 * The published-profiles grid's columns.
 *
 * Every column is sortable except the two that are controls (the visibility
 * `Select`) or meaningless to order (the view count is meaningful, so it
 * sorts). `DataGrid` owns the header control, so a sortable def only needs an
 * `id` plus an `accessorFn`.
 *
 * The owner column pins on mobile so "whose page is this" stays readable while
 * the rest of the row scrolls underneath (see `ui/data-grid/sticky`).
 */
export function buildProfileColumns(
    onVisibilityChange: (userId: string, visibility: string) => void
): DataGridColumn<AdminProfile>[] {
    return [
        {
            id: 'owner',
            header: 'Fresher',
            accessorFn: (row) => profileOwnerName(row),
            cell: ({ row }) => {
                const profile = row.original;
                return (
                    <div className="flex min-w-0 flex-col">
                        {profile.user.username ? (
                            <a
                                href={`/u/${profile.user.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-semibold text-foreground hover:text-primary hover:underline"
                            >
                                {profileOwnerName(profile)}
                            </a>
                        ) : (
                            <span className="truncate font-semibold text-foreground">
                                {profileOwnerName(profile)}
                            </span>
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                            {profile.user.email ?? 'No email on file'}
                        </span>
                    </div>
                );
            },
            meta: { sticky: 'left' },
        },
        {
            id: 'gradYear',
            header: 'Grad year',
            accessorFn: (row) => row.gradYear ?? 0,
            cell: ({ row }) => (
                <span className="whitespace-nowrap tabular-nums">
                    {row.original.gradYear ?? <span className="italic text-muted-foreground">Not set</span>}
                </span>
            ),
        },
        {
            id: 'skills',
            header: 'Skills',
            accessorFn: (row) => row.skills.join(', '),
            cell: ({ row }) => {
                const { skills } = row.original;
                if (skills.length === 0) {
                    return <span className="italic text-muted-foreground">None listed</span>;
                }
                return (
                    <span className="block max-w-56 truncate" title={skills.join(', ')}>
                        {skills.slice(0, 3).join(', ')}
                        {skills.length > 3 ? ` +${skills.length - 3}` : ''}
                    </span>
                );
            },
        },
        {
            id: 'views',
            header: 'Views',
            accessorFn: (row) => row.views,
            cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.views}</span>,
        },
        {
            id: 'pageState',
            header: 'Page',
            accessorFn: (row) => row.pageState,
            cell: ({ row }) => {
                const meta = pageStateBadge(row.original.pageState);
                return (
                    <Badge variant={meta.variant} size="sm">
                        {meta.label}
                    </Badge>
                );
            },
        },
        {
            id: 'visibility',
            header: 'Visibility',
            accessorFn: (row) => row.visibility,
            // The cell IS the control, so a sort button above it would be noise on
            // top of a dropdown rather than a second, redundant way to read it.
            enableSorting: false,
            cell: ({ row }) => {
                const profile = row.original;
                return (
                    <Select
                        value={profile.visibility}
                        onValueChange={(value) => onVisibilityChange(profile.userId, value)}
                    >
                        <SelectTrigger
                            className="w-32"
                            aria-label={`Visibility for ${profileOwnerName(profile)}`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {VISIBILITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            },
        },
    ];
}
