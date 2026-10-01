'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bell, BellOff, Plus, Trash2 } from 'lucide-react';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { SavedSearch } from '@fresherflow/api-client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Skeleton } from '@/ui/Skeleton';
import { cn } from '@/ui/cn';
import { formatWorkMode } from '@/features/profile/preferences';
import { NewSearchDialog } from './NewSearchDialog';

const SIGN_IN_REDIRECT = '/jobs?tab=searches';

type FilterChip = { key: string; label: string };

function filterChips(filters: SavedSearch['filters']): FilterChip[] {
    const chips: FilterChip[] = [];
    if (filters.feedType === 'walkins') chips.push({ key: 'feedType', label: 'Walk-ins' });
    else if (filters.feedType === 'internships') chips.push({ key: 'feedType', label: 'Internships' });
    else if (filters.feedType === 'remote') chips.push({ key: 'feedType', label: 'Remote' });
    else if (filters.feedType === '2026') chips.push({ key: 'feedType', label: '2026 batch' });
    else if (filters.type) chips.push({ key: 'feedType', label: filters.type });
    if (filters.city) chips.push({ key: 'city', label: filters.city });
    if (filters.company) chips.push({ key: 'company', label: filters.company });
    if (filters.tag) chips.push({ key: 'tag', label: `#${filters.tag}` });
    if (filters.batch) chips.push({ key: 'batch', label: `${filters.batch} batch` });
    if (filters.minSalary) chips.push({ key: 'minSalary', label: `≥ ${filters.minSalary / 100000}L` });
    if (filters.closingSoon) chips.push({ key: 'closingSoon', label: 'Closing soon' });
    if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”` });
    (filters.workModes ?? []).forEach((mode) =>
        chips.push({ key: `mode:${mode}`, label: formatWorkMode(mode.toUpperCase()) }),
    );
    (filters.skills ?? []).forEach((skill) => chips.push({ key: `skill:${skill}`, label: skill }));
    (filters.roles ?? []).forEach((role) => chips.push({ key: `role:${role}`, label: role }));
    (filters.experience ?? []).forEach((exp) => chips.push({ key: `exp:${exp}`, label: exp }));
    return chips;
}

function buildSearchUrl(filters: SavedSearch['filters']): string {
    const params = new URLSearchParams();
    // The saved shape is storage-side; `/jobs` only reads location/year/skills/
    // role/experience/mode/q — map onto those, or "View matches" opens an
    // unfiltered feed while claiming the search applied.
    if (filters.city) params.set('location', filters.city);
    if (filters.company) params.set('company', filters.company);
    const skills = new Set(filters.skills ?? []);
    if (filters.tag) skills.add(filters.tag);
    skills.forEach((skill) => params.append('skills', skill));
    if (filters.batch) params.set('year', String(filters.batch));
    if (filters.q) params.set('q', filters.q);
    (filters.roles ?? []).forEach((role) => params.append('role', role));
    (filters.experience ?? []).forEach((exp) => params.append('experience', exp));
    (filters.workModes ?? []).forEach((mode) => params.append('mode', mode.toLowerCase()));
    if (filters.minSalary) params.set('minSalary', String(filters.minSalary));
    if (filters.closingSoon) params.set('closingSoon', 'true');
    if (filters.feedType === 'walkins') return `/drives/walk-in${params.toString() ? `?${params}` : ''}`;
    if (filters.feedType === 'internships') return `/jobs/internships${params.toString() ? `?${params}` : ''}`;
    if (filters.feedType === 'remote') return `/jobs/remote${params.toString() ? `?${params}` : ''}`;
    const suffix = params.toString() ? `?${params}` : '';
    return `/jobs${suffix}`;
}

/**
 * Alert switch — the reference notifications-form row gives alerts a Switch,
 * not a text button. No switch primitive exists in @/ui, so this is a native
 * button with role="switch": full keyboard support, token-only styling, no
 * new dependency.
 */
function AlertSwitch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={onChange}
            className="inline-flex shrink-0 items-center rounded-full outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
        >
            <span
                className={cn(
                    'flex h-6 w-11 items-center rounded-full px-0.5 transition-colors duration-150',
                    checked ? 'justify-end bg-primary' : 'justify-start bg-muted'
                )}
            >
                <span
                    className={cn(
                        'flex size-5 items-center justify-center rounded-full shadow transition-colors duration-150',
                        checked ? 'bg-primary-foreground text-primary' : 'border border-border bg-background text-muted-foreground'
                    )}
                >
                    {checked
                        ? <Bell className="size-3" aria-hidden="true" />
                        : <BellOff className="size-3" aria-hidden="true" />}
                </span>
            </span>
        </button>
    );
}

function RowSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-4" aria-hidden="true">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <div className="flex gap-1.5">
                        <Skeleton variant="pill" className="h-5 w-16" />
                        <Skeleton variant="pill" className="h-5 w-20" />
                        <Skeleton variant="pill" className="h-5 w-14" />
                    </div>
                </div>
                <Skeleton variant="pill" className="h-6 w-11" />
            </div>
        </div>
    );
}

/**
 * "Searches" tab on /jobs — the user's saved job searches with match alerts.
 * Saved searches are user-specific, so they live with the other user tabs and
 * are gated behind auth. Signed-out visitors get a sign-in prompt; the create
 * form is never rendered anonymously.
 *
 * Creation lives in NewSearchDialog: the page itself stays a pure list and
 * never grows an inline form that pushes content down.
 */
/** The banner used to say "Something went wrong" for every failure. Tell the
 * user which of the three real causes it actually was. */
function describeLoadError(err: unknown): string {
    const e = err as { statusCode?: number; status?: number; message?: string; name?: string };
    const status = e.statusCode ?? e.status;
    if (e.name === 'OfflineError' || status === 0) {
        return 'Cannot reach the FresherFlow API. Start it locally (pnpm --filter ./apps/api dev) or check NEXT_PUBLIC_API_URL.';
    }
    if (status === 401) return 'Your session expired — sign out and back in to load saved searches.';
    if (status === 403) return 'This account is not allowed to read saved searches.';
    if (status === 429) return 'Too many requests — wait a moment, then retry.';
    if (status && status >= 500) {
        return `The API returned ${status}${e.message ? ` — ${e.message}` : '.'}`;
    }
    return e.message ? `Couldn’t load saved searches — ${e.message}` : 'Couldn’t load saved searches.';
}

export function SearchesTab() {
    const { user, isLoading: authLoading } = useAuth();
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        fresherNeedsApi
            .listSavedSearches()
            .then((res) => setSearches(res.searches))
            .catch((err) => setError(describeLoadError(err)))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            load();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user, load]);

    async function toggleAlert(s: SavedSearch) {
        // Optimistic: the switch answers instantly, the banner speaks on failure.
        setSearches((prev) => prev.map((row) => (row.id === s.id ? { ...row, alertEnabled: !row.alertEnabled } : row)));
        try {
            await fresherNeedsApi.updateSavedSearch(s.id, { alertEnabled: !s.alertEnabled });
        } catch {
            setSearches((prev) => prev.map((row) => (row.id === s.id ? { ...row, alertEnabled: s.alertEnabled } : row)));
            setError('Couldn’t save the alert change — try again.');
        }
    }

    async function remove(id: string) {
        try {
            await fresherNeedsApi.deleteSavedSearch(id);
            setSearches((prev) => prev.filter((s) => s.id !== id));
        } catch {
            setError('Couldn’t delete this search — try again.');
        }
    }

    if (authLoading || loading) {
        return (
            <div className="mx-auto w-full max-w-7xl space-y-3 px-3 py-4 md:space-y-4 md:px-6 md:py-8" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                    <RowSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-6 md:py-8">
                <EmptyState
                    icon="search"
                    size="md"
                    title="Sign in to save searches"
                    description="Save “2026 batch + Bangalore” and get alerted when matching jobs land."
                    action={
                        <Button asChild size="sm">
                            <Link href={`/login?redirect=${encodeURIComponent(SIGN_IN_REDIRECT)}`}>Sign in</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 md:space-y-6 md:px-6 md:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Searches</h1>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {searches.length} saved
                    </span>
                </div>
                <Button
                    type="button"
                    size="chip"
                    onClick={() => setDialogOpen(true)}
                >
                    <Plus className="size-4" aria-hidden="true" />
                    New search
                </Button>
            </div>

            {error ? (
                <ErrorMessage
                    message={error}
                    onRetry={() => load()}
                    variant="subtle"
                />
            ) : null}

            {!error && searches.length === 0 ? (
                <EmptyState
                    icon="search"
                    size="md"
                    variant="ghost"
                    title="No saved searches yet"
                    description="Save “2026 batch + Bangalore” and get alerted when matching jobs land."
                    action={
                        <Button type="button" size="chip" onClick={() => setDialogOpen(true)}>
                            <Plus className="size-4" aria-hidden="true" />
                            New search
                        </Button>
                    }
                />
            ) : null}

            {searches.length > 0 ? (
                <div className="space-y-3">
                    {searches.map((s) => {
                        const chips = filterChips(s.filters);
                        return (
                            <Card key={s.id} padded>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                                            {s.newMatchCount != null && s.newMatchCount > 0 ? (
                                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                                                    +{s.newMatchCount} new
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {chips.length > 0 ? (
                                                chips.map((chip) => (
                                                    <Badge key={chip.key} variant="secondary" size="sm">
                                                        {chip.label}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <Badge variant="secondary" size="sm">All jobs</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <AlertSwitch
                                        checked={!!s.alertEnabled}
                                        onChange={() => void toggleAlert(s)}
                                        label={`Match alerts for ${s.name}`}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                                    <Button asChild size="linkSm" variant="link">
                                        <Link href={buildSearchUrl(s.filters)}>
                                            View matches
                                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    </Button>
                                    <Button
                                        type="button"
                                        size="iconSm"
                                        variant="ghostDanger"
                                        onClick={() => void remove(s.id)}
                                        aria-label={`Delete ${s.name}`}
                                        title={`Delete ${s.name}`}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : null}

            <NewSearchDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSaved={() => load()}
                onError={() => setError('Couldn’t save this search — try again.')}
            />
        </div>
    );
}

export default SearchesTab;
