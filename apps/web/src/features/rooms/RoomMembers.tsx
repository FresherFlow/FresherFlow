'use client';

import { useState } from 'react';
import { communityApi } from '@fresherflow/api-client';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { ActiveThisWeekBadge, type RoomMember } from './roomShared';

const PAGE_SIZE = 20;

export function RoomMembers({
    slug,
    initialMembers,
    memberCount,
}: {
    slug: string;
    initialMembers: RoomMember[];
    memberCount: number;
}) {
    // Page 1 rides along with getRoom; further pages come from the dedicated
    // members endpoint. Same order on both sides (newest first), so appending
    // pages never reorders the list.
    const [members, setMembers] = useState<RoomMember[]>(initialMembers);
    const [total, setTotal] = useState(memberCount);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(memberCount > initialMembers.length);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        setLoadError(false);
        try {
            const result = await communityApi.listRoomMembers(slug, { page: page + 1, limit: PAGE_SIZE });
            setMembers((prev) => [...prev, ...(result.members as RoomMember[])]);
            setTotal(result.total);
            setPage(result.page);
            setHasMore(result.hasMore);
        } catch {
            setLoadError(true);
        } finally {
            setLoadingMore(false);
        }
    };

    if (total === 0) {
        return (
            <EmptyState
                icon="inbox"
                size="md"
                title="No members in this room yet"
                description="Nobody has joined this room yet."
                variant="ghost"
            />
        );
    }

    return (
        <div className="space-y-2">
            {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {m.user.avatarUrl ? (
                            <img src={m.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                                {(m.user.username || m.user.fullName || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {m.user.fullName || m.user.username || 'Anonymous'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Joined {new Date(m.joinedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {m.activeThisWeek ? <ActiveThisWeekBadge /> : null}
                        {m.role !== 'MEMBER' ? (
                            <Badge variant="secondary" size="sm">
                                {m.role}
                            </Badge>
                        ) : null}
                    </div>
                </div>
            ))}
            {loadError ? (
                <ErrorMessage
                    variant="subtle"
                    message="Could not load more members."
                    onRetry={() => void loadMore()}
                />
            ) : null}
            {hasMore ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-sm text-muted-foreground tabular-nums">
                        {members.length} of {total.toLocaleString()} members
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                    >
                        {loadingMore ? 'Loading…' : 'Load more'}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
