'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { Room, RoomListResult } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';

const ROOM_TYPES = [
    { value: '', label: 'All' },
    { value: 'BATCH', label: 'Batch' },
    { value: 'SKILL', label: 'Skill' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'COMPANY', label: 'Company' },
    { value: 'TOPIC', label: 'Topic' },
];

export function RoomsDirectory() {
    const [data, setData] = useState<RoomListResult>({
        rooms: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [type, setType] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState<'popular' | 'newest'>('popular');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listRooms({
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
                    placeholder="Search rooms..."
                    className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Type filter + Sort */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {ROOM_TYPES.map((t) => (
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

            {/* Room list */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    Could not load rooms.{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">Retry</button>
                </div>
            ) : data.rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    {debouncedSearch || type ? 'No rooms match your filters.' : 'No rooms yet.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.rooms.map((room) => (
                        <RoomCard key={room.id} room={room} />
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

// ─── Room Card ───────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: Room }) {
    return (
        <Link
            href={`/rooms/${room.slug}`}
            className="block rounded-2xl border border-border bg-card p-4 space-y-2 transition-all hover:shadow-md hover:border-primary/20 active-press-soft"
        >
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">{room.name}</h3>
                    <span className="text-xs text-muted-foreground">{room.type}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {room.lastActiveThisWeek && (
                        <span className="flex items-center gap-1 rounded-full bg-signal-live/10 px-2 py-0.5 text-xs font-bold text-signal-live uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-signal-live" />
                            Active
                        </span>
                    )}
                    {room.isMember && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">Joined</span>
                    )}
                </div>
            </div>
            {room.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{room.memberCount.toLocaleString()} members</span>
                <span>{room.postCount} posts</span>
                <span>{room.jobCount} jobs</span>
            </div>
        </Link>
    );
}
