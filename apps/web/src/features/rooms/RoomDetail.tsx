'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    LinkIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';
import { communityApi } from '@fresherflow/api-client';
import type { Room } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/ui/Button';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Skeleton } from '@/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { RoomPosts, RoomPostSkeleton } from './RoomPosts';
import { RoomJobs } from './RoomJobs';
import { RoomMembers } from './RoomMembers';
import { ActiveThisWeekBadge, type RoomMember, type RoomTab } from './roomShared';

function RoomDetailSkeleton() {
    return (
        <div className="space-y-6" aria-hidden="true">
            <Skeleton className="h-4 w-16" />
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton variant="panel" className="h-8 w-20" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <div className="flex gap-4 border-b border-border">
                {['Posts', 'Jobs', 'Members'].map((label) => (
                    <Skeleton key={label} variant="tabActive" className="h-9 w-20" />
                ))}
            </div>
            <div className="space-y-3">
                {[1, 2].map((index) => <RoomPostSkeleton key={index} />)}
            </div>
        </div>
    );
}

export function RoomDetail({ slug }: { slug: string }) {
    const { user } = useAuth();
    const [room, setRoom] = useState<Room | null>(null);
    const [members, setMembers] = useState<RoomMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<RoomTab>('posts');
    const [joining, setJoining] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);

    const handleInvite = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/community/rooms/${slug}`);
            setInviteCopied(true);
            window.setTimeout(() => setInviteCopied(false), 2000);
        } catch {
            // Clipboard unavailable (permissions) — selection fallback omitted
            // deliberately; the URL bar carries the same link.
        }
    }, [slug]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.getRoom(slug);
            setRoom(result.room);
            setMembers(result.members || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { void load(); }, [load]);

    // Silent refresh: same fetch without the skeleton flash. Used after
    // join/leave/share so header counts, membership and forms never go stale
    // (a stale isMember is what produced "Join the room before sharing"
    // right after leaving).
    const refreshQuiet = useCallback(async () => {
        try {
            const result = await communityApi.getRoom(slug);
            setRoom(result.room);
            setMembers(result.members || []);
        } catch {
            // Keep stale UI on transient failure; next navigation reloads.
        }
    }, [slug]);

    const handleJoinLeave = async () => {
        if (!room || !user) return;
        setJoining(true);
        try {
            if (room.isMember) {
                await communityApi.leaveRoom(room.slug);
                setRoom({ ...room, isMember: false, memberCount: room.memberCount - 1 });
            } else {
                await communityApi.joinRoom(room.slug);
                setRoom({ ...room, isMember: true, memberCount: room.memberCount + 1 });
            }
            // Quiet: no skeleton flash on every toggle.
            await refreshQuiet();
        } finally {
            setJoining(false);
        }
    };

    if (loading) return <RoomDetailSkeleton />;
    if (error || !room) {
        return (
            <div className="space-y-4">
                <ErrorMessage
                    variant="card"
                    title="Room not found"
                    message="This room may have been renamed or removed, or the community service did not answer."
                    onRetry={() => void load()}
                />
                <div className="flex justify-center">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/community?tab=rooms">Browse rooms</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const isMember = !!room.isMember;
    const canModerate = isMember && (room.memberRole === 'ADMIN' || room.memberRole === 'MODERATOR');

    // `room.icon` is a short text column, never an image URL: a single emoji
    // or short label renders as text inside the standard initial block, and
    // anything longer falls back to the name initial. Never an <img>.
    const roomIconText = (room.icon ?? '').trim();
    const roomBadgeText = roomIconText && Array.from(roomIconText).length <= 4
        ? roomIconText
        : (room.name || 'R')[0].toUpperCase();

    return (
        <div className="space-y-6">
            {/* Back */}
            <Link
                href="/community?tab=rooms"
                className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
                ← Rooms
            </Link>

            {/* Room header */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                            {roomBadgeText}
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-bold text-foreground">{room.name}</h1>
                            {room.tags && room.tags.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    {room.tags.map((t) => `#${t}`).join(' ')}
                                </span>
                            )}
                        </div>
                    </div>
                    {user ? (
                        <div className="shrink-0">
                            <Button
                                type="button"
                                onClick={() => void handleJoinLeave()}
                                disabled={joining}
                                // Join is the invitation; Leave reverses it rather
                                // than destroying anything, so it stays a quiet
                                // outline control instead of a solid destructive one.
                                variant={room.isMember ? 'outline' : 'default'}
                                size="sm"
                            >
                                {joining ? '…' : room.isMember ? 'Leave' : 'Join'}
                            </Button>
                        </div>
                    ) : (
                        <div className="shrink-0">
                            <Button asChild variant="secondary" size="sm">
                                <Link href="/login">Sign in to Join</Link>
                            </Button>
                        </div>
                    )}
                </div>
                {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>{room.memberCount.toLocaleString()} members</span>
                        <span>{room.postCount} posts</span>
                        <span>{room.opportunityCount} jobs</span>
                        {room.lastActiveThisWeek ? <ActiveThisWeekBadge /> : null}
                    </div>
                    <div className="flex items-center gap-3">
                        {members.length > 0 ? (
                            <div className="flex items-center" aria-label={`${room.memberCount} members`}>
                                {members.slice(0, 5).map((m) => (
                                    <span key={m.user.id} title={m.user.fullName || m.user.username || 'Member'} className="-ml-2 first:ml-0 rounded-full border-2 border-card">
                                        {m.user.avatarUrl ? (
                                            <img src={m.user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                                        ) : (
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-micro font-bold text-muted-foreground">
                                                {(m.user.username || m.user.fullName || '?')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </span>
                                ))}
                                {room.memberCount > members.length ? (
                                    <span className="ml-1 text-sm font-semibold text-muted-foreground">
                                        +{(room.memberCount - members.length).toLocaleString()}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleInvite()}
                            aria-label="Copy invite link"
                        >
                            {inviteCopied ? (
                                <CheckIcon className="h-4 w-4 text-signal-live" aria-hidden="true" />
                            ) : (
                                <LinkIcon className="h-4 w-4" aria-hidden="true" />
                            )}
                            {inviteCopied ? 'Copied' : 'Invite'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(value) => setTab(value as RoomTab)}>
                <TabsList>
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="jobs">Jobs</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>
                <TabsContent value="posts">
                    <RoomPosts
                        slug={room.slug}
                        roomId={room.id}
                        isMember={isMember}
                        signedIn={!!user}
                        onJoined={refreshQuiet}
                        onPosted={refreshQuiet}
                    />
                </TabsContent>
                <TabsContent value="jobs">
                    <RoomJobs
                        slug={room.slug}
                        isMember={isMember}
                        canModerate={canModerate}
                        viewerId={user?.id ?? null}
                        onMemberChange={refreshQuiet}
                    />
                </TabsContent>
                <TabsContent value="members">
                    <RoomMembers
                        slug={room.slug}
                        initialMembers={members}
                        memberCount={room.memberCount}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
