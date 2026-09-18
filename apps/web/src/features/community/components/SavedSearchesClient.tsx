'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { SavedSearch } from '@fresherflow/api-client';

function describeFilters(filters: SavedSearch['filters']): string {
    const parts: string[] = [];
    if (filters.feedType === 'walkins') parts.push('Walk-ins');
    else if (filters.feedType === 'internships') parts.push('Internships');
    else if (filters.feedType === 'remote') parts.push('Remote');
    else if (filters.feedType === '2026') parts.push('2026 batch');
    else if (filters.type) parts.push(filters.type);
    if (filters.city) parts.push(filters.city);
    if (filters.company) parts.push(filters.company);
    if (filters.tag) parts.push(`#${filters.tag}`);
    if (filters.batch) parts.push(`${filters.batch} batch`);
    if (filters.minSalary) parts.push(`≥ ${filters.minSalary / 100000}L`);
    if (filters.closingSoon) parts.push('closing soon');
    return parts.length ? parts.join(' · ') : 'All jobs';
}

function buildSearchUrl(filters: SavedSearch['filters']): string {
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.company) params.set('company', filters.company);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.batch) params.set('batch', String(filters.batch));
    if (filters.minSalary) params.set('minSalary', String(filters.minSalary));
    if (filters.closingSoon) params.set('closingSoon', 'true');
    if (filters.feedType === 'walkins') return `/jobs/walkins${params.toString() ? `?${params}` : ''}`;
    if (filters.feedType === 'internships') return `/jobs/internships${params.toString() ? `?${params}` : ''}`;
    if (filters.feedType === 'remote') return `/jobs/remote${params.toString() ? `?${params}` : ''}`;
    const suffix = params.toString() ? `?${params}` : '';
    return `/jobs${suffix}`;
}

export function SavedSearchesClient() {
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [company, setCompany] = useState('');
    const [batch, setBatch] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        fresherNeedsApi
            .listSavedSearches()
            .then((res) => setSearches(res.searches))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const filters: SavedSearch['filters'] = {};
            if (city.trim()) filters.city = city.trim();
            if (company.trim()) filters.company = company.trim();
            if (batch) filters.batch = parseInt(batch, 10);
            await fresherNeedsApi.createSavedSearch({
                name: name.trim() || 'My search',
                filters,
                alertEnabled: true,
            });
            setName('');
            setCity('');
            setCompany('');
            setBatch('');
            load();
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    }

    async function toggleAlert(s: SavedSearch) {
        await fresherNeedsApi.updateSavedSearch(s.id, { alertEnabled: !s.alertEnabled });
        load();
    }

    async function remove(id: string) {
        await fresherNeedsApi.deleteSavedSearch(id);
        setSearches((prev) => prev.filter((s) => s.id !== id));
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Create form */}
            <form onSubmit={save} className="space-y-3 rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Save a search — get alerted when new jobs match</p>
                <div className="grid grid-cols-2 gap-3">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Bangalore walk-ins)" maxLength={80}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City (optional)" maxLength={80}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                    <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" maxLength={120}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                    <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Batch, e.g. 2026 (optional)" inputMode="numeric"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                </div>
                <button type="submit" disabled={saving}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save search'}
                </button>
            </form>

            {error && <p className="text-sm text-destructive">Something went wrong. Try refreshing.</p>}

            {!error && searches.length === 0 && (
                <div className="rounded-2xl border border-border p-8 text-center">
                    <p className="text-sm font-medium text-foreground">No saved searches yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Save &quot;2026 batch + Bangalore&quot; and we&apos;ll count new matches for you.
                    </p>
                </div>
            )}

            {/* Saved list */}
            <div className="space-y-3">
                {searches.map((s) => (
                    <article key={s.id} className="rounded-2xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-foreground">{s.name}</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">{describeFilters(s.filters)}</p>
                            </div>
                            {s.newMatchCount != null && s.newMatchCount > 0 && (
                                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                                    +{s.newMatchCount} new
                                </span>
                            )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <Link
                                href={buildSearchUrl(s.filters)}
                                className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                            >
                                View matches
                            </Link>
                            <button
                                type="button"
                                onClick={() => toggleAlert(s)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    s.alertEnabled
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-muted/40 text-muted-foreground'
                                }`}
                            >
                                {s.alertEnabled ? 'Alerts on' : 'Alerts off'}
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(s.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                Tip: browse <Link href="/jobs" className="text-primary hover:underline">jobs</Link> and watch for new matches on your saved searches.
            </p>
        </div>
    );
}
