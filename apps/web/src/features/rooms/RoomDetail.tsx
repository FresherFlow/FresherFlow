'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { Room, CommunityPost, CommunityFeedResult, CommunityPostUser } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

export function RoomDetail({ slug }: { slug: string }) {
    const { user } = useAuth();
    const [room, setRoom] = useState<Room | null>(null);
    const [members, setMembers] = useState<Array<{ user: CommunityPostUser; role: string; joinedAt: string; activeThisWeek?: boolean }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<'posts' | 'jobs' | 'members'>('posts');
    const [joining, setJoining] = useState(false);

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
            const result = await communityApi.getRoom(slug);
            setRoom(result.room);
            setMembers(result.members || []);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return null;
    if (error || !room) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                Room not found.{' '}
                <Link href="/rooms" className="font-semibold text-primary hover:underline">Browse rooms</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back */}
            <Link href="/rooms" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ← Rooms
            </Link>

            {/* Room header */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{room.name}</h1>
                            <span className="text-xs text-muted-foreground">{room.type}</span>
                        </div>
                    </div>
{user && room && (
    <button
        type="button"
        onClick={() => void handleJoinLeave()}
        disabled={joining}
        className={cn(
            'shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
            room.isMember
                ? 'border border-border bg-card text-muted-foreground hover:border-destructive hover:text-destructive'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            joining && 'opacity-50'
        )}
    >
        {joining ? '…' : room.isMember ? 'Leave' : 'Join'}
    </button>
)}
{!user && (
    <Link
        href="/login"
        className="shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
    >
        Sign in to Join
    </Link>
)}
                </div>
                {room.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{room.memberCount.toLocaleString()} members</span>
                    <span>{room.postCount} posts</span>
                    <span>{room.jobCount} jobs</span>
                    {room.lastActiveThisWeek && (
                        <span className="flex items-center gap-1 rounded-full bg-signal-live/10 px-2 py-0.5 text-xs font-bold text-signal-live uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-signal-live" />
                            Active this week
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {(['posts', 'jobs', 'members'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={cn(
                            'px-4 py-2 text-xs font-semibold transition-colors border-b-2',
                            tab === t
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'posts' && <RoomPosts slug={room.slug} />}
            {tab === 'jobs' && <RoomJobs slug={room.slug} />}
            {tab === 'members' && <RoomMembers members={members} />}
        </div>
    );
}

// ─── Room Posts ──────────────────────────────────────────────────────────────

function RoomPosts({ slug }: { slug: string }) {
    const [data, setData] = useState<CommunityFeedResult>({
        posts: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await communityApi.listRoomPosts(slug, { page: 1, limit: 50 });
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { void load(); }, [load]);

    if (loading) return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />)}</div>;

    if (data.posts.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No posts in this room yet. Be the first to contribute!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
    );
}

// ─── Room Jobs ───────────────────────────────────────────────────────────────

function RoomJobs({ slug }: { slug: string }) {
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<Array<{ id: string; title: string; company: string; type: string; location?: string; salary?: string | null; applied?: boolean }>>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        communityApi.listRoomPosts(slug, { page: 1, limit: 50 })
            .then((result) => {
                if (!cancelled) {
                    setJobs(result.posts.map((p) => ({
                        id: p.id,
                        title: p.title,
                        company: p.author?.fullName || p.author?.username || 'Room',
                        type: p.category,
                        location: (p.tags?.[0]) || undefined,
                        salary: null,
                        applied: false,
                    })));
                }
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [slug]);

    if (loading) return <div className="h-20 animate-pulse rounded-xl bg-muted/40" />;
    if (error) return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">Could not load jobs.</div>;

    return (
        <div className="space-y-3">
            {jobs.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    No job listings in this room yet.
                </div>
            )}
            {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company} · {job.type}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Room Members ────────────────────────────────────────────────────────────

function RoomMembers({ members }: { members: Array<{ user: CommunityPostUser; role: string; joinedAt: string; activeThisWeek?: boolean }> }) {
    if (members.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No members yet. Be the first to join!
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {m.user.avatarUrl ? (
                            <img src={m.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {(m.user.username || m.user.fullName || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {m.user.fullName || m.user.username || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Joined {new Date(m.joinedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {m.activeThisWeek && (
                            <span className="flex items-center gap-1 rounded-full bg-signal-live/10 px-2 py-0.5 text-xs font-bold text-signal-live uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-signal-live" />
                                Active this week
                            </span>
                        )}
                        {m.role !== 'MEMBER' && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary uppercase">
                                {m.role}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Post Card (minimal) ─────────────────────────────────────────────────────

function PostCard({ post }: { post: CommunityPost }) {
    const CATEGORY_STYLES: Record<string, string> = {
        DISCUSSION: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400',
        QUESTION: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-400/10 dark:text-yellow-400',
        EXPERIENCE: 'bg-green-500/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
        UPDATE: 'bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400',
        REFERRAL: 'bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-400',
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider', CATEGORY_STYLES[post.category] || 'bg-muted text-muted-foreground')}>
                    {post.category}
                </span>
                {post.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        #{tag}
                    </span>
                ))}
            </div>
            <p className="text-sm font-semibold text-foreground line-clamp-2">{post.title}</p>
            {post.body && <p className="text-xs text-muted-foreground line-clamp-2">{post.body}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{post.author?.fullName || post.author?.username || 'Anonymous'}</span>
                <span>{post.likesCount} helpful</span>
                <span>{post.commentsCount} comments</span>
            </div>
        </div>
    );
}
