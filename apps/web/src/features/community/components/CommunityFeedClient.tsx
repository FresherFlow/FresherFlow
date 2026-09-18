'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import { CommunityPostCategory } from '@fresherflow/types';
import type { CommunityFeedResult, CommunityPost, CommunityPostComment } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const CATEGORIES: { value: CommunityPostCategory; label: string }[] = [
    { value: CommunityPostCategory.DISCUSSION, label: 'Discussion' },
    { value: CommunityPostCategory.QUESTION, label: 'Questions' },
    { value: CommunityPostCategory.EXPERIENCE, label: 'Experiences' },
    { value: CommunityPostCategory.INTERVIEW_EXPERIENCE, label: 'Interviews' },
    { value: CommunityPostCategory.HIRING_UPDATE, label: 'Hiring Updates' },
    { value: CommunityPostCategory.REFERRAL, label: 'Referrals' },
    { value: CommunityPostCategory.UPDATE, label: 'Updates' },
    { value: CommunityPostCategory.OTHER, label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    CATEGORIES.map((c) => [c.value, c.label])
);

// ─── Vote Button ─────────────────────────────────────────────────────────────

function VoteButton({
    upvotes,
    myVote,
    onVote,
}: {
    upvotes: number;
    myVote: number | null;
    onVote: (value: number) => Promise<{ upvotes: number; myVote: number | null }>;
}) {
    const [optimistic, setOptimistic] = useState<{ count: number; vote: number | null } | null>(null);
    const [voting, setVoting] = useState(false);
    const display = optimistic ?? { count: upvotes, vote: myVote };

    const handleVote = async (value: number) => {
        if (voting) return;
        setVoting(true);
        const prev = display;
        setOptimistic({
            count: prev.vote === value ? prev.count - 1 : prev.vote ? prev.count : prev.count + 1,
            vote: prev.vote === value ? null : value,
        });
        try {
            const result = await onVote(value);
            setOptimistic({ count: result.upvotes, vote: result.myVote });
        } catch {
            setOptimistic(null);
        } finally {
            setVoting(false);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => void handleVote(1)}
                className={cn(
                    'rounded-md px-2 py-1 text-xs font-bold transition-colors',
                    display.vote === 1
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
            >
                ▲
            </button>
            <span className="ff-min-w-2ch text-center text-xs font-semibold tabular-nums text-foreground">
                {display.count}
            </span>
            <button
                type="button"
                onClick={() => void handleVote(-1)}
                className={cn(
                    'rounded-md px-2 py-1 text-xs font-bold transition-colors',
                    display.vote === -1
                        ? 'bg-destructive/15 text-destructive'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
            >
                ▼
            </button>
        </div>
    );
}

// ─── Comment Thread ──────────────────────────────────────────────────────────

function CommentThread({
    postId,
    comments,
    onCommentAdded,
    onCommentDeleted,
}: {
    postId: string;
    comments: CommunityPostComment[];
    onCommentAdded: (comment: CommunityPostComment) => void;
    onCommentDeleted: (commentId: string) => void;
}) {
    const { user } = useAuth();
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyTo, setReplyTo] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const comment = await communityApi.addCommunityPostComment(postId, {
                body: body.trim(),
                parentId: replyTo ?? undefined,
            });
            onCommentAdded(comment);
            setBody('');
            setReplyTo(null);
        } catch {
            // silently fail
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        try {
            await communityApi.deleteCommunityPostComment(postId, commentId);
            onCommentDeleted(commentId);
        } catch {
            // silently fail
        }
    };

    const handleCommentVote = async (commentId: string, value: number) => {
        return communityApi.voteCommunityPostComment(postId, commentId, value);
    };

    return (
        <div className="space-y-3 border-t border-border pt-3">
            {comments.map((c) => (
                <div key={c.id} className="group flex gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-foreground">
                                @{c.author.username || c.author.fullName || 'Anon'}
                            </span>
                            <span className="text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap break-words">{c.body}</p>
                        <div className="mt-1 flex items-center gap-3">
                            {user ? (
                                <VoteButton
                                    upvotes={c.likesCount}
                                    myVote={(c.votes?.[0]?.value ?? null) as number | null}
                                    onVote={(v) => handleCommentVote(c.id, v)}
                                />
                            ) : (
                                <span className="text-xs text-muted-foreground">▲ {c.likesCount}</span>
                            )}
                            {user && (
                                <button
                                    type="button"
                                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                                    className="text-xs font-semibold text-muted-foreground hover:text-primary"
                                >
                                    {replyTo === c.id ? 'Cancel' : 'Reply'}
                                </button>
                            )}
                            {user && c.author.id === user.id && (
                                <button
                                    type="button"
                                    onClick={() => void handleDelete(c.id)}
                                    className="text-xs font-semibold text-destructive/60 hover:text-destructive md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {user && (
                <div className="flex gap-2">
                    {replyTo && (
                        <div className="flex items-center rounded-lg bg-muted/40 px-2 text-xs text-muted-foreground">
                            ↳ replying
                        </div>
                    )}
                    <input
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleSubmit();
                            }
                        }}
                        placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting || !body.trim()}
                        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? '…' : 'Send'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Single Post Card ────────────────────────────────────────────────────────

function PostCard({ post: initial }: { post: CommunityPost }) {
    const { user } = useAuth();
    const [post, setPost] = useState(initial);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<CommunityPostComment[]>(initial.comments ?? []);

    const handleVote = async (value: number) => {
        return communityApi.voteCommunityPost(post.id, value);
    };

    const handleCommentAdded = (comment: CommunityPostComment) => {
        setComments((prev) => [...prev, comment]);
        setPost((prev) => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
    };

    const handleCommentDeleted = (commentId: string) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPost((prev) => ({ ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) }));
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-foreground">
                    @{post.author.username || post.author.fullName || 'Anonymous'}
                </span>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {CATEGORY_LABELS[post.category] || post.category}
                </span>
                <span className="text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                </span>
            </div>

            <Link href={`/community/${post.id}`} className="block group">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
            </Link>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">{post.body}</p>
            {post.body.length > 200 && (
                <Link href={`/community/${post.id}`} className="text-xs font-semibold text-primary hover:underline">
                    Read more →
                </Link>
            )}

            {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-4">
                {user ? (
                    <VoteButton upvotes={post.likesCount} myVote={(post.votes?.[0]?.value ?? null) as number | null} onVote={handleVote} />
                ) : (
                    <span className="text-xs text-muted-foreground">▲ {post.likesCount}</span>
                )}
                <button
                    type="button"
                    onClick={() => setShowComments(!showComments)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                </button>
            </div>

            {showComments && (
                <CommentThread
                    postId={post.id}
                    comments={comments}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                />
            )}
        </div>
    );
}

// ─── Main Feed ───────────────────────────────────────────────────────────────

export function CommunityFeedClient() {
    const { user } = useAuth();
    const searchParams = useSearchParams();

    const [posts, setPosts] = useState<CommunityFeedResult['posts']>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [category, setCategory] = useState<CommunityPostCategory | undefined>(
        (searchParams.get('category') as CommunityPostCategory) || undefined
    );
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
    const [hasMore, setHasMore] = useState(false);

    // Post creation form
    const [newPostTitle, setNewPostTitle] = useState(searchParams.get('title') || '');
    const [newPostBody, setNewPostBody] = useState(searchParams.get('body') || '');
    const [newPostCategory, setNewPostCategory] = useState<CommunityPostCategory>(
        (searchParams.get('category') as CommunityPostCategory) || CommunityPostCategory.DISCUSSION
    );
    const [newPostTags, setNewPostTags] = useState('');
    const [posting, setPosting] = useState(false);

    const sourceOpportunityId = searchParams.get('sourceOpportunityId') || undefined;

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load trending tags once
    useEffect(() => {
        communityApi.listTrendingTags(15).then((res) => setTrendingTags(res.tags)).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listCommunityPosts({
                page, limit: 20, category,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                search: debouncedSearch || undefined,
            });
            setPosts(result.posts);
            setTotal(result.total);
            setHasMore(result.hasMore);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [page, category, selectedTags, debouncedSearch]);

    useEffect(() => { void load(); }, [load]);

    const handleCreatePost = async () => {
        if (!newPostTitle.trim() || !newPostBody.trim()) return;
        setPosting(true);
        try {
            const tags = newPostTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
            await communityApi.createCommunityPost({
                title: newPostTitle.trim(),
                body: newPostBody.trim(),
                category: newPostCategory,
                tags: tags.length > 0 ? tags : undefined,
                sourceOpportunityId,
            });
            setNewPostTitle('');
            setNewPostBody('');
            setNewPostCategory(CommunityPostCategory.DISCUSSION);
            setNewPostTags('');
            setPage(1);
            await load();
        } catch {
            setError(true);
        } finally {
            setPosting(false);
        }
    };

    const handleCategoryChange = (value: CommunityPostCategory | undefined) => {
        setCategory(value);
        setPage(1);
    };

    const handleTagToggle = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
        setPage(1);
    };

    const clearAllFilters = () => {
        setCategory(undefined);
        setSelectedTags([]);
        setSearchQuery('');
        setDebouncedSearch('');
        setPage(1);
    };

    const hasActiveFilters = !!category || selectedTags.length > 0 || !!debouncedSearch;

    return (
        <div className="space-y-6">
            {/* ── New Post Form ── */}
            {user && (
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <h2 className="text-sm font-bold text-foreground">Start a Discussion</h2>
                    {sourceOpportunityId && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary font-semibold">
                            Linked to an expired opportunity — your post will include a link back.
                        </div>
                    )}
                    <input
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <textarea
                        value={newPostBody}
                        onChange={(e) => setNewPostBody(e.target.value)}
                        rows={3}
                        placeholder="Share your thoughts..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={newPostCategory}
                            onChange={(e) => setNewPostCategory(e.target.value as CommunityPostCategory)}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                        <input
                            value={newPostTags}
                            onChange={(e) => setNewPostTags(e.target.value)}
                            placeholder="Tags (comma-separated)"
                            className="flex-1 min-w-[200px] rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <button
                        onClick={() => void handleCreatePost()}
                        disabled={posting || !newPostTitle.trim() || !newPostBody.trim()}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                        {posting ? 'Posting…' : 'Post'}
                    </button>
                </div>
            )}

            {/* ── Search Bar ── */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search discussions..."
                    className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* ── Category Filters ── */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => handleCategoryChange(undefined)}
                    className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                        category === undefined
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                >
                    All
                </button>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleCategoryChange(cat.value)}
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                            category === cat.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* ── Trending Tags ── */}
            {trendingTags.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trending Tags</span>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {trendingTags.map(({ tag, count }) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleTagToggle(tag)}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                                    selectedTags.includes(tag)
                                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                )}
                            >
                                #{tag}
                                <span className="opacity-60">{count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Active Filters Summary ── */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Showing:</span>
                    {category && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">{category}</span>
                    )}
                    {selectedTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                            #{tag}
                        </span>
                    ))}
                    {debouncedSearch && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                            &quot;{debouncedSearch}&quot;
                        </span>
                    )}
                </div>
            )}

            {/* ── Feed ── */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/40" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    Could not load the community feed.{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">
                        Retry
                    </button>
                </div>
            ) : posts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    {hasActiveFilters
                        ? 'No posts match your filters. Try removing some filters.'
                        : 'No discussions yet. Be the first to start one!'}
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}

                    {/* ── Pagination ── */}
                    {(page > 1 || hasMore) && (
                        <div className="flex items-center justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-lg px-4 py-2.5 min-h-[44px] text-xs font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                            >
                                ← Previous
                            </button>
                            <span className="text-xs text-muted-foreground">
                                Page {page} · {total} posts
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!hasMore}
                                className="rounded-lg px-4 py-2.5 min-h-[44px] text-xs font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
