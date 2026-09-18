'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { Area, AreaListResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const AREA_TYPES = [
    { value: '', label: 'All' },
    { value: 'BATCH', label: 'Batch' },
    { value: 'SKILL', label: 'Skill' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'COMPANY', label: 'Company' },
    { value: 'TOPIC', label: 'Topic' },
];

export function AreasDirectoryClient() {
    const { user } = useAuth();
    const [data, setData] = useState<AreaListResult>({
        areas: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState<'popular' | 'newest'>('popular');
    const [page, setPage] = useState(1);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listAreas({
                page, limit: 20, type: type || undefined,
                search: debouncedSearch || undefined, sort,
            });
            setData(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [page, type, debouncedSearch, sort]);

    useEffect(() => { void load(); }, [load]);

    const handleTypeChange = (value: string) => { setType(value); setPage(1); };
    const handleSortChange = (value: 'popular' | 'newest') => { setSort(value); setPage(1); };

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search areas..."
                    className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Type filter + Sort */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {AREA_TYPES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => handleTypeChange(t.value)}
                            className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                type === t.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleSortChange('popular')}
                        className={cn(
                            'rounded-lg px-2 py-1 text-xs font-bold transition-colors',
                            sort === 'popular' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        Popular
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSortChange('newest')}
                        className={cn(
                            'rounded-lg px-2 py-1 text-xs font-bold transition-colors',
                            sort === 'newest' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                        )}
                    >
                        New
                    </button>
                </div>
            </div>

            {/* Create area */}
            {user && (
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowCreate(!showCreate)}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                    >
                        {showCreate ? 'Cancel' : '+ Create Area'}
                    </button>
                </div>
            )}

            {showCreate && <CreateAreaForm onCreated={() => { setShowCreate(false); void load(); }} />}

            {/* Area list */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    Could not load areas.{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">Retry</button>
                </div>
            ) : data.areas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    {debouncedSearch || type ? 'No areas match your filters.' : 'No areas yet. Create the first one!'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.areas.map((area) => (
                        <AreaCard key={area.id} area={area} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {(page > 1 || data.hasMore) && (
                <div className="flex items-center justify-between pt-2">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                    >
                        ← Previous
                    </button>
                    <span className="text-xs text-muted-foreground">Page {page}</span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data.hasMore}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Area Card ───────────────────────────────────────────────────────────────

function AreaCard({ area }: { area: Area }) {
    return (
        <Link
            href={`/community/areas/${area.slug}`}
            className="block rounded-2xl border border-border bg-card p-4 space-y-2 transition-all hover:shadow-md hover:border-primary/20 active-press-soft"
        >
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{area.name}</h3>
                    <span className="text-xs text-muted-foreground">{area.type}</span>
                </div>
                {area.isMember && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Joined</span>
                )}
            </div>
            {area.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{area.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{area.memberCount.toLocaleString()} members</span>
                <span>{area.postCount} posts</span>
                <span>{area.jobCount} jobs</span>
            </div>
        </Link>
    );
}

// ─── Create Area Form ────────────────────────────────────────────────────────

function CreateAreaForm({ onCreated }: { onCreated: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('CUSTOM');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Name is required.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await communityApi.createArea({ name: name.trim(), description: description.trim() || undefined, type });
            onCreated();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create area.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 Batch"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    placeholder="What is this area about?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                    <option value="BATCH">Batch</option>
                    <option value="SKILL">Skill</option>
                    <option value="LOCATION">Location</option>
                    <option value="COMPANY">Company</option>
                    <option value="TOPIC">Topic</option>
                    <option value="CUSTOM">Custom</option>
                </select>
            </div>
            <button type="button" onClick={() => void handleSubmit()} disabled={submitting || !name.trim()}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Area'}
            </button>
        </div>
    );
}
