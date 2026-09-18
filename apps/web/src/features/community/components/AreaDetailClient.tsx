'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { Area, CommunityPost, CommunityFeedResult, CommunityPostUser } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

export function AreaDetailClient({ slug }: { slug: string }) {
    const { user } = useAuth();
    const [area, setArea] = useState<Area | null>(null);
    const [members, setMembers] = useState<Array<{ user: CommunityPostUser; role: string; joinedAt: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<'posts' | 'jobs' | 'members'>('posts');
    const [joining, setJoining] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const a = await communityApi.getArea(slug);
            setArea(a.area);
            setMembers(a.members || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { void load(); }, [load]);

    const handleJoinLeave = async () => {
        if (!area || !user) return;
        setJoining(true);
        try {
            if (area.isMember) {
                await communityApi.leaveArea(area.slug);
                setArea({ ...area, isMember: false, memberCount: area.memberCount - 1 });
            } else {
                await communityApi.joinArea(area.slug);
                setArea({ ...area, isMember: true, memberCount: area.memberCount + 1 });
            }
        } finally {
            setJoining(false);
        }
    };

    if (loading) return null;
    if (error || !area) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                Area not found.{' '}
                <Link href="/community/areas" className="font-semibold text-primary hover:underline">Browse areas</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back */}
            <Link href="/community/areas" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ← Areas
            </Link>

            {/* Area header */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{area.name}</h1>
                            <span className="text-xs text-muted-foreground">{area.type}</span>
                        </div>
                    </div>
                    {user && (
                        <button
                            type="button"
                            onClick={() => void handleJoinLeave()}
                            disabled={joining}
                            className={cn(
                                'shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition-all',
                                area.isMember
                                    ? 'border border-border bg-card text-muted-foreground hover:border-destructive hover:text-destructive'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                                joining && 'opacity-50'
                            )}
                        >
                            {joining ? '…' : area.isMember ? 'Leave' : 'Join'}
                        </button>
                    )}
                </div>
                {area.description && <p className="text-sm text-muted-foreground">{area.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{area.memberCount.toLocaleString()} members</span>
                    <span>{area.postCount} posts</span>
                    <span>{area.jobCount} jobs</span>
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
            {tab === 'posts' && <AreaPosts slug={area.slug} />}
            {tab === 'jobs' && <AreaJobs slug={area.slug} />}
            {tab === 'members' && <AreaMembers members={members} />}
        </div>
    );
}

// ─── Area Posts ──────────────────────────────────────────────────────────────

function AreaPosts({ slug }: { slug: string }) {
    const [data, setData] = useState<CommunityFeedResult>({
        posts: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await communityApi.listAreaPosts(slug, { page: 1, limit: 50 });
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
                No posts in this area yet. Be the first to contribute!
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
    );
}

// ─── Area Jobs ───────────────────────────────────────────────────────────────

function AreaJobs({ slug }: { slug: string }) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, [slug]);

    if (loading) return <div className="h-20 animate-pulse rounded-xl bg-muted/40" />;

    return (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
            Job listings in this area coming soon.
        </div>
    );
}

// ─── Area Members ────────────────────────────────────────────────────────────

function AreaMembers({ members }: { members: Array<{ user: CommunityPostUser; role: string; joinedAt: string }> }) {
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
                    {m.role !== 'MEMBER' && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                            {m.role}
                        </span>
                    )}
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
                <span>⬆ {post.likesCount}</span>
                <span>{post.commentsCount} comments</span>
            </div>
        </div>
    );
}
