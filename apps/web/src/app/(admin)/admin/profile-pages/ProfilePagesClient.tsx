'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/core';
import { useAdmin } from '@/lib/auth/AdminContext';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Skeleton } from '@/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { DataGrid } from '@/ui/data-grid/DataGrid';
import {
    ALL_INTRO_STATUSES,
    ALL_PAGE_STATES,
    INTRO_STATUS_FILTER_OPTIONS,
    INTRO_STATUS_OPTIONS,
    PAGE_STATE_OPTIONS,
    buildProfileColumns,
    introStatusBadge,
    type AdminProfile,
    type IntroRequest,
} from './ProfileColumns';

/**
 * Short purpose line for the page. It replaced a stats sentence that leaked
 * internal naming ("the Day-30 number") into user-facing copy; an operator only
 * needs to know the page holds two things.
 */
const PAGE_DESCRIPTION = 'See who has a published profile page, and chase recruiter intro requests.';

type ProfileTab = 'intros' | 'profiles';
type IntroStatusFilter = typeof ALL_INTRO_STATUSES | IntroRequest['status'];

function extractEmail(text: string | null): string | null {
    if (!text) return null;
    const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return match ? match[0] : null;
}

function formatWhen(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function AdminProfilePagesPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();

    const [tab, setTab] = useState<ProfileTab>('intros');
    const [statusFilter, setStatusFilter] = useState<IntroStatusFilter>('PENDING');
    const [intros, setIntros] = useState<IntroRequest[]>([]);
    const [introStats, setIntroStats] = useState({ total: 0, pending: 0 });
    const [introSearch, setIntroSearch] = useState('');
    const [profiles, setProfiles] = useState<AdminProfile[]>([]);
    const [pageState, setPageState] = useState<string>(ALL_PAGE_STATES);
    const [profileSearch, setProfileSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        setError(null);
        try {
            if (tab === 'intros') {
                const res = await apiClient<{ success: boolean; data: IntroRequest[]; stats: { total: number; pending: number } }>(
                    `/api/admin/profiles/intro-requests?status=${statusFilter}`,
                );
                setIntros(res.data ?? []);
                if (res.stats) setIntroStats(res.stats);
            } else {
                const res = await apiClient<{ success: boolean; data: AdminProfile[] }>('/api/admin/profiles');
                setProfiles(res.data ?? []);
            }
        } catch {
            setError('Failed to load. Try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, tab, statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (isAuthenticated === false) router.replace('/admin/login');
    }, [isAuthenticated, router]);

    const updateStatus = useCallback(
        async (id: string, status: string) => {
            setIntros((prev) => prev.map((i) => (i.id === id ? { ...i, status: status as IntroRequest['status'] } : i)));
            try {
                await apiClient(`/api/admin/profiles/intro-requests/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status }),
                });
            } catch {
                void load();
            }
        },
        [load]
    );

    const setVisibility = useCallback(
        async (userId: string, visibility: string) => {
            setProfiles((prev) =>
                prev.map((p) => (p.userId === userId ? { ...p, visibility: visibility as AdminProfile['visibility'] } : p)),
            );
            try {
                await apiClient(`/api/admin/profiles/${userId}/visibility`, {
                    method: 'PATCH',
                    body: JSON.stringify({ visibility }),
                });
            } catch {
                void load();
            }
        },
        [load]
    );

    const profileColumns = useMemo(
        () => buildProfileColumns((userId, visibility) => void setVisibility(userId, visibility)),
        [setVisibility]
    );

    // Intro requests are a per-request triage queue, not a dataset to compare
    // across rows, so this tab stays a card list (shadcn-admin's `apps` shape)
    // while the profiles tab is a real table and gets the DataGrid.
    const visibleIntros = useMemo(() => {
        const query = introSearch.trim().toLowerCase();
        if (!query) return intros;
        return intros.filter((intro) =>
            [
                intro.recruiter?.fullName,
                intro.recruiter?.email,
                extractEmail(intro.message),
                intro.candidate.fullName,
                intro.candidate.username,
                intro.message,
            ].some((field) => field?.toLowerCase().includes(query))
        );
    }, [intros, introSearch]);

    // Page state is the one facet worth slicing the profile list by, and every
    // row is already loaded, so the grid's own filter select can drive it.
    const filteredProfiles = useMemo(
        () => (pageState === ALL_PAGE_STATES ? profiles : profiles.filter((p) => p.pageState === pageState)),
        [profiles, pageState]
    );

    const clearProfileFilters = useCallback(() => {
        setPageState(ALL_PAGE_STATES);
        setProfileSearch('');
    }, []);

    if (!isAuthenticated) return null;

    const hasIntros = intros.length > 0;
    const hasProfiles = profiles.length > 0;
    const profilesFilteredToZero = hasProfiles && filteredProfiles.length === 0;
    const busy = isLoading;
    const updating = busy && hasIntros;

    // No rows and nothing loading: the first load failed, so there is nothing to
    // keep on screen behind the error. A failure that arrives WITH rows (filter
    // change, background refetch) falls through to the subtle inline banner and
    // leaves the queue readable.
    if (error && !hasIntros && !hasProfiles) {
        return (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 text-foreground md:p-8">
                <PageHeader updating={false} />
                <ErrorMessage
                    title="Could not load profile pages"
                    message={error}
                    onRetry={() => void load()}
                    variant="card"
                />
            </div>
        );
    }

    return (
        // `flex-1 min-h-0 overflow-y-auto` is load-bearing: the admin shell
        // clips its content column, so a page without its own scroll container
        // cannot be scrolled and the bottom rows are unreachable. `min-h-0` is
        // what lets this flex child shrink far enough for `overflow-y-auto` to
        // engage at all.
        //
        // No page-level top padding: AdminLayoutClient already reserves the
        // mobile top offset with `pt-14 md:pt-18 lg:pt-0` on the content column,
        // so restating it here double-stacked the gap and collided with the
        // fixed MobileTopNav. `pb-20` clears the fixed AdminBottomNav, which does
        // render on this path and is `md:hidden`, so `md:p-8` — which includes
        // the bottom edge — takes over from there.
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 text-foreground md:p-8">
            <PageHeader updating={updating} />

            {error ? (
                <ErrorMessage
                    className="shrink-0"
                    message={error}
                    onRetry={() => void load()}
                    variant="subtle"
                />
            ) : null}

            {/* `Tabs` owns its own spacing, so the vertical rhythm between the
                switcher row and the active panel comes from this plain wrapper
                instead of a className on the primitive. */}
            <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <TabsList>
                            <TabsTrigger value="intros">
                                Intro requests
                                {introStats.total > 0 ? (
                                    <Badge variant="secondary" size="sm" className="ml-2">
                                        {introStats.total}
                                    </Badge>
                                ) : null}
                            </TabsTrigger>
                            <TabsTrigger value="profiles">
                                Published profiles
                                {hasProfiles ? (
                                    <Badge variant="secondary" size="sm" className="ml-2">
                                        {profiles.length}
                                    </Badge>
                                ) : null}
                            </TabsTrigger>
                        </TabsList>

                        {tab === 'intros' ? (
                            <div
                                className="flex flex-wrap gap-2"
                                role="group"
                                aria-label="Filter intro requests by status"
                            >
                                {INTRO_STATUS_FILTER_OPTIONS.map((option) => (
                                    <Button
                                        key={option.value}
                                        size="sm"
                                        variant={statusFilter === option.value ? 'default' : 'outline'}
                                        aria-pressed={statusFilter === option.value}
                                        onClick={() => setStatusFilter(option.value as IntroStatusFilter)}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <TabsContent value="intros">
                        {busy && !hasIntros ? (
                            <div className="space-y-3" aria-hidden="true">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardContent className="space-y-2 p-4">
                                            <Skeleton variant="subtle" className="h-4 w-3/4" />
                                            <Skeleton variant="subtle" className="h-3 w-1/2" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : !hasIntros ? (
                            statusFilter === ALL_INTRO_STATUSES ? (
                                <EmptyState
                                    title="No intro requests yet"
                                    description="Recruiters who ask for a fresher's profile will show up here."
                                    icon="inbox"
                                    size="md"
                                    variant="ghost"
                                />
                            ) : (
                                <EmptyState
                                    title="Nothing in this view"
                                    description="No intro requests are waiting under this status."
                                    icon="search"
                                    size="md"
                                    variant="ghost"
                                    action={
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setStatusFilter(ALL_INTRO_STATUSES)}
                                        >
                                            Show all requests
                                        </Button>
                                    }
                                />
                            )
                        ) : (
                            <div className="space-y-4">
                                <Input
                                    value={introSearch}
                                    onChange={(e) => setIntroSearch(e.target.value)}
                                    placeholder="Search recruiter, candidate or message…"
                                    variant="search"
                                    aria-label="Search intro requests"
                                    className="h-9 w-full sm:w-72"
                                />
                                {visibleIntros.length === 0 ? (
                                    <EmptyState
                                        title="No matching requests"
                                        description="Nothing here matches your search."
                                        icon="search"
                                        size="md"
                                        variant="ghost"
                                        action={
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIntroSearch('')}
                                            >
                                                Clear search
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {visibleIntros.map((intro) => (
                                            <li key={intro.id}>
                                                <Card>
                                                    <CardContent className="space-y-2 p-4">
                                                        <IntroCardBody
                                                            intro={intro}
                                                            onStatusChange={(status) => void updateStatus(intro.id, status)}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </TabsContent>

                <TabsContent value="profiles">
                    <DataGrid<AdminProfile>
                        data={filteredProfiles}
                        columns={profileColumns}
                        getRowId={(row) => row.userId}
                        title="Published profiles"
                        countLabel="profiles"
                        // No bulk endpoint exists for the visibility PATCH, so
                        // selection is off rather than shipping dead checkboxes.
                        enableSelection={false}
                        // Only the first load blanks the body; a background refetch
                        // keeps the rows already on screen.
                        isLoading={busy && !hasProfiles}
                        searchPlaceholder="Search name, email or skill…"
                        showViewOptions
                        searchValue={profileSearch}
                        onSearchChange={setProfileSearch}
                        statusValue={pageState}
                        statusOptions={PAGE_STATE_OPTIONS}
                        onStatusChange={(value) => setPageState(value)}
                        onClear={clearProfileFilters}
                        noResults={
                            profilesFilteredToZero ? (
                                <EmptyState
                                    title="No matching profiles"
                                    description="Nothing here matches the current search and filters."
                                    icon="search"
                                    size="md"
                                    variant="ghost"
                                    action={
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={clearProfileFilters}
                                        >
                                            Clear filters
                                        </Button>
                                    }
                                />
                            ) : (
                                <EmptyState
                                    title="No published profiles yet"
                                    description="A fresher's page appears here once they activate it."
                                    icon="inbox"
                                    size="md"
                                    variant="ghost"
                                />
                            )
                        }
                        /* The bare root already carries `flex min-h-0 flex-1
                           flex-col` and renders exactly one `rounded-md border`
                           surface, so the page adds no frame of its own. */
                        variant="bare"
                    />
                </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

/** One intro request: who is asking, who they are asking about, and the two
 *  status controls (a read-only `Badge` for scanning, a `Select` to change it). */
function IntroCardBody({
    intro,
    onStatusChange,
}: {
    intro: IntroRequest;
    onStatusChange: (status: string) => void;
}) {
    const status = introStatusBadge(intro.status);
    const contact = intro.recruiter?.email || extractEmail(intro.message);

    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 text-sm">
                    <span className="font-semibold text-foreground">
                        {intro.recruiter?.fullName || 'Anonymous recruiter'}
                    </span>
                    {contact ? <span className="text-muted-foreground"> · {contact}</span> : null}
                    <p className="text-muted-foreground">
                        Wants to talk to{' '}
                        <span className="font-medium text-foreground">
                            {intro.candidate.fullName || intro.candidate.username || intro.candidate.email || 'a fresher'}
                        </span>
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={status.variant} size="sm">
                        {status.label}
                    </Badge>
                    <Select value={intro.status} onValueChange={onStatusChange}>
                        <SelectTrigger
                            className="w-32"
                            aria-label={`Status for the intro request from ${intro.recruiter?.fullName || 'an anonymous recruiter'}`}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INTRO_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {intro.message ? (
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{intro.message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{formatWhen(intro.createdAt)}</p>
        </>
    );
}

/** One header row, shadcn-admin `index.tsx` shape: a short title and a single
 *  line of description on the left, the one status signal on the right. The
 *  per-tab counts are not repeated here — they ride on the tab triggers.
 *
 *  The `h1` is `sr-only` below `lg`: `MobileTopNav` already prints the route
 *  name on a phone and `TopHeaderBar` prints it at `lg+`, so a visible heading
 *  made the page name appear twice on mobile. `sr-only` keeps it in the
 *  accessibility tree as the page's heading; `lg:not-sr-only` restores the
 *  desktop rendering. The description is body copy under that title, so it is
 *  `text-base` — the same step already taken on /admin/users and /admin/audit. */
function PageHeader({ updating }: { updating: boolean }) {
    return (
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
                <h1 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight text-foreground">Profile pages</h1>
                <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
            </div>
            {updating ? (
                <Badge variant="muted" size="sm" aria-live="polite">
                    Updating…
                </Badge>
            ) : null}
        </div>
    );
}
