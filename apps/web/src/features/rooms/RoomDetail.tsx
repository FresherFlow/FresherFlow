'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LinkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { communityApi } from '@fresherflow/api-client';
import type { Room, CommunityPost, CommunityFeedResult, CommunityPostUser } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { cn } from '@repo/ui/utils/cn';

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
    const [members, setMembers] = useState<Array<{ user: CommunityPostUser; role: string; joinedAt: string; activeThisWeek?: boolean }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState<'posts' | 'jobs' | 'members'>('posts');
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
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                Room not found.{' '}
                <Link href="/community?tab=rooms" className="font-semibold text-primary hover:underline">Browse rooms</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back */}
            <Link href="/community?tab=rooms" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                ← Rooms
            </Link>

            {/* Room header */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {room.icon ? (
                            <img src={room.icon} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                                {(room.name || 'R')[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold text-foreground">{room.name}</h1>
                            {room.tags && room.tags.length > 0 && (
                                <span className="text-xs text-muted-foreground">{room.tags.map((t) => `#${t}`).join(' ')}</span>
                            )}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{room.memberCount.toLocaleString()} members</span>
                        <span>{room.postCount} posts</span>
                        <span>{room.opportunityCount} jobs</span>
                        {room.lastActiveThisWeek && (
                            <span className="flex items-center gap-1 rounded-full bg-signal-live/10 px-2 py-0.5 text-xs font-bold text-signal-live uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-signal-live" />
                                Active this week
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {members.length > 0 ? (
                            <div className="flex items-center" aria-label={`${room.memberCount} members`}>
                                {members.slice(0, 5).map((m) => (
                                    <span key={m.user.id} title={m.user.fullName || m.user.username || 'Member'} className="-ml-2 first:ml-0 rounded-full border-2 border-card">
                                        {m.user.avatarUrl ? (
                                            <img src={m.user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                                        ) : (
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                                {(m.user.username || m.user.fullName || '?')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </span>
                                ))}
                                {room.memberCount > members.length ? (
                                    <span className="ml-1 text-xs font-semibold text-muted-foreground">
                                        +{(room.memberCount - members.length).toLocaleString()}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void handleInvite()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                            aria-label="Copy invite link"
                        >
                            {inviteCopied ? (
                                <CheckIcon className="h-3.5 w-3.5 text-signal-live" />
                            ) : (
                                <LinkIcon className="h-3.5 w-3.5" />
                            )}
                            {inviteCopied ? 'Copied' : 'Invite'}
                        </button>
                    </div>
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
            {tab === 'jobs' && (
                <RoomJobs slug={room.slug} isMember={!!room.isMember} onMemberChange={refreshQuiet} />
            )}
            {tab === 'members' && <RoomMembers members={members} />}
        </div>
    );
}

function RoomPostSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
                <Skeleton variant="pill" className="h-5 w-24" />
                <Skeleton variant="pill" className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}

function RoomJobSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
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

    if (loading) {
        return (
            <div className="space-y-3" aria-hidden="true">
                {[1, 2].map((index) => <RoomPostSkeleton key={index} />)}
            </div>
        );
    }

    if (data.posts.length === 0) {
        return (
            <EmptyState
                icon="inbox"
                size="md"
                title="No posts in this room yet"
                description="Start the first discussion for this batch."
                variant="ghost"
                action={
                    <Link
                        href="/community?tab=discussions"
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Start a discussion
                    </Link>
                }
            />
        );
    }

    return (
        <div className="space-y-3">
            {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
    );
}

// ─── Room Jobs ───────────────────────────────────────────────────────────────

// ─── Room Jobs (deliberately shared opportunities, not posts) ───────────────
// RoomOpportunity rows are created ONLY by member share / moderator pin
// (server phase 9). Tags never surface jobs here.

interface RoomJobRow {
    reason: 'PINNED' | 'SHARED';
    createdAt: string;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
        locations: string[];
        salaryRange: string | null;
        status: string;
    };
    addedBy: { id: string; fullName: string | null; username: string | null } | null;
}

function RoomJobs({ slug, isMember, onMemberChange }: { slug: string; isMember: boolean; onMemberChange: () => void }) {
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<RoomJobRow[]>([]);
    const [error, setError] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSubmitUrl, setShareSubmitUrl] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listRoomOpportunities(slug, { page: 1, limit: 50 });
            setJobs(result.opportunities ?? []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        communityApi
            .listRoomOpportunities(slug, { page: 1, limit: 50 })
            .then((result) => {
                if (!cancelled) setJobs(result.opportunities ?? []);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const handleShare = async () => {
        const raw = shareUrl.trim();
        if (!raw || sharing) return;
        // Accept a full job URL or a bare slug/id — the server resolves it.
        // Guard the obvious non-job paste (e.g. the room URL itself) locally
        // with a specific message instead of a generic server 404.
        const lowered = raw.toLowerCase();
        if (
            lowered.includes('/community/rooms/') ||
            lowered.includes('/rooms/') ||
            lowered.includes('/community?') ||
            lowered.includes('/community/')
        ) {
            setShareError('That looks like a room or community link, not a job — open any job and paste its link.');
            return;
        }
        const slugOrId = raw.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
        if (!slugOrId) {
            setShareError('Paste a job link or slug.');
            return;
        }
        setSharing(true);
        setShareError(null);
        setShareSubmitUrl(null);
        try {
            await communityApi.shareRoomOpportunity(slug, slugOrId);
            setShareUrl('');
            // Refresh counts + membership quietly; a 403 here means the
            // membership went stale mid-session, so re-sync instead of
            // leaving the form up with a raw error.
            await load();
            onMemberChange();
        } catch (e) {
            const status = (e as { status?: number })?.status;
            if (status === 403) {
                setShareError('Only members can share — join the room first.');
                onMemberChange();
            } else if (status === 404) {
                // External posting (e.g. a Workday/ATS link): it can never
                // resolve to a local listing. Offer the contribute flow
                // instead of a dead end — but only for foreign hosts. A
                // FresherFlow URL missing locally is a data gap, not a
                // submission case (submitting it would duplicate).
                let foreign = false;
                try {
                    const host = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.toLowerCase();
                    foreign =
                        !host.includes('fresherflow') &&
                        host !== 'localhost' &&
                        host !== '127.0.0.1';
                } catch {
                    foreign = false;
                }
                if (foreign) {
                    setShareError('This posting is not in our listings yet.');
                    setShareSubmitUrl(raw);
                } else {
                    setShareError('Job not found in our listings. Open it on FresherFlow and try again.');
                }
            } else {
                setShareError(e instanceof Error ? e.message : 'Could not share this job.');
            }
        } finally {
            setSharing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3" aria-hidden="true">
                {[1, 2].map((index) => <RoomJobSkeleton key={index} />)}
            </div>
        );
    }
    if (error) return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">Could not load jobs.</div>;

    return (
        <div className="space-y-3">
            {isMember ? (
                <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            onChange={(e) => {
                                setShareUrl(e.target.value);
                                setShareSubmitUrl(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleShare();
                            }}
                            placeholder="Paste a job link to share it here…"
                            aria-label="Job link to share"
                            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                            type="button"
                            onClick={() => void handleShare()}
                            disabled={sharing || !shareUrl.trim()}
                            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                            {sharing ? 'Sharing…' : 'Share'}
                        </button>
                    </div>
                    {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}
                    {shareSubmitUrl ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Link
                                href="/contribute"
                                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                Submit it for review
                            </Link>
                            <span className="text-xs text-muted-foreground">
                                It can be shared here once approved.
                            </span>
                        </div>
                    ) : null}
                </div>
            ) : null}
            {jobs.length === 0 && (
                <EmptyState
                    icon="inbox"
                    size="md"
                    title="No job listings in this room yet"
                    description={isMember ? 'Share the first opening — batchmates see it here.' : 'Join the room to share openings with the batch.'}
                    variant="ghost"
                />
            )}
            {jobs.map(({ opportunity: job, reason, addedBy }) => (
                <Link
                    key={`${job.id}-${reason}`}
                    href={`/jobs/${job.slug}`}
                    className="block rounded-xl border border-border bg-card p-4 space-y-2 transition-colors hover:border-primary/30"
                >
                    <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{job.title}</p>
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                                reason === 'PINNED'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                            )}
                        >
                            {reason === 'PINNED' ? 'Pinned' : 'Shared'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {job.company}
                        {job.locations?.length ? ` · ${job.locations.join(', ')}` : ''}
                        {job.salaryRange ? ` · ${job.salaryRange}` : ''}
                    </p>
                    {addedBy ? (
                        <p className="text-xs text-muted-foreground">
                            Shared by {addedBy.fullName || addedBy.username || 'a member'}
                        </p>
                    ) : null}
                </Link>
            ))}
        </div>
    );
}

// ─── Room Members ────────────────────────────────────────────────────────────

function RoomMembers({ members }: { members: Array<{ user: CommunityPostUser; role: string; joinedAt: string; activeThisWeek?: boolean }> }) {
    if (members.length === 0) {
        return (
            <EmptyState
                icon="inbox"
                size="md"
                title="No members in this room yet"
                description=""
                variant="ghost"
            />
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
