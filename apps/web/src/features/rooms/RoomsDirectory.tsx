'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { Room, RoomListResult } from '@fresherflow/types';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Skeleton } from '@/ui/Skeleton';

export function RoomsDirectory() {
    const [data, setData] = useState<RoomListResult>({
        rooms: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
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
                page, limit: 20,
                search: debouncedSearch || undefined, sort,
            });
            setData(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, sort]);

    useEffect(() => { void load(); }, [load]);

    const handleSortChange = (value: 'popular' | 'newest') => { setSort(value); setPage(1); };

    return (
        <div className="space-y-4">
            {/* One toolbar: search left, sort right. This used to be
                three stacked rows (search, chips, sort) which read as a wall of
                chrome before any room was visible. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    type="search"
                    variant="form"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rooms"
                    aria-label="Search rooms"
                    className="sm:w-72"
                />

                <div role="group" aria-label="Sort rooms" className="flex shrink-0 items-center gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant={sort === 'popular' ? 'default' : 'outline'}
                        aria-pressed={sort === 'popular'}
                        onClick={() => handleSortChange('popular')}
                    >
                        Popular
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={sort === 'newest' ? 'default' : 'outline'}
                        aria-pressed={sort === 'newest'}
                        onClick={() => handleSortChange('newest')}
                    >
                        New
                    </Button>
                </div>
            </div>

            {/* Room list */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
                    {[1, 2, 3, 4].map((index) => <RoomCardSkeleton key={index} />)}
                </div>
            ) : error ? (
                <ErrorMessage
                    title="Could not load rooms"
                    message="The rooms directory did not load."
                    onRetry={() => void load()}
                    variant="card"
                />
            ) : data.rooms.length === 0 ? (
                <EmptyState
                    icon={debouncedSearch ? 'search' : 'inbox'}
                    size="md"
                    title={debouncedSearch ? 'No rooms match your search' : 'No rooms yet'}
                    description={debouncedSearch ? 'Try a different search term.' : 'Rooms appear here once they are created.'}
                    variant="ghost"
                    action={
                        debouncedSearch ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                            >
                                Clear filters
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                /* `lg:grid-cols-3 xl:grid-cols-4` to match the reference apps
                   grid: a room card is short (name, description, 3 counts), so two
                   columns left a 1900px screen mostly empty. */
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {data.rooms.map((room) => (
                        <RoomCard key={room.id} room={room} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {(page > 1 || data.hasMore) && (
                <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">
                        Page {page} · {data.total.toLocaleString()} rooms
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data.hasMore}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

function RoomCardSkeleton() {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Skeleton variant="pill" className="h-5 w-14" />
                    <Skeleton variant="pill" className="h-5 w-12" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
    );
}

// ─── Room Card ───────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: Room }) {
    return (
        <Link
            href={`/community/rooms/${room.slug}`}
            className="block rounded-2xl border border-border bg-card p-4 space-y-2 transition-colors hover:border-primary/30 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md"
        >
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-foreground">{room.name}</h3>
                    {room.tags && room.tags.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {room.tags.map((t) => `#${t}`).join(' ')}
                        </span>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {room.lastActiveThisWeek && (
                        <Badge variant="success" size="sm">
                            Active
                        </Badge>
                    )}
                    {room.isMember && (
                        <Badge variant="secondary" size="sm">
                            Joined
                        </Badge>
                    )}
                </div>
            </div>
            {room.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="tabular-nums">{room.memberCount.toLocaleString()} members</span>
                <span className="tabular-nums">{room.postCount} posts</span>
                <span className="tabular-nums">{room.opportunityCount} jobs</span>
            </div>
        </Link>
    );
}
