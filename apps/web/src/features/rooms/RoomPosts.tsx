'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Link from 'next/link';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { communityApi } from '@fresherflow/api-client';
import { CommunityPostCategory } from '@fresherflow/types';
import type { CommunityFeedResult } from '@fresherflow/types';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/Select';
import { Skeleton } from '@/ui/Skeleton';
import { Textarea } from '@/ui/Textarea';
import { PostCard } from '@/features/community/components/PostCard';
import { CATEGORIES } from '@/features/community/components/postCategories';

export function RoomPostSkeleton() {
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

/**
 * The signed-in composer: category + title on one row, body under it, send on
 * the right. Enter posts and Shift+Enter adds a line — the reference chats
 * composer contract, widened to a title/body post.
 */
function PostComposer({
    roomId,
    onPosted,
}: {
    roomId: string;
    onPosted: () => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<string>(CommunityPostCategory.DISCUSSION);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canPost = !!title.trim() && !!body.trim() && !posting;

    const submit = async () => {
        if (!canPost) return;
        setPosting(true);
        setError(null);
        try {
            await communityApi.createCommunityPost({
                title: title.trim(),
                body: body.trim(),
                category: category as CommunityPostCategory,
                // The server resolves this against Room.id, never the slug.
                roomId,
            });
            setTitle('');
            setBody('');
            setCategory(CommunityPostCategory.DISCUSSION);
            // Quiet on both sides: the list and the header's post count must
            // never disagree about the same room.
            await onPosted();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not post. Try again.');
        } finally {
            setPosting(false);
        }
    };

    const onBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
    };

    return (
        <form
            onSubmit={(event) => { event.preventDefault(); void submit(); }}
            className="space-y-3 rounded-xl border border-border bg-card p-4"
        >
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-48">
                    <Field label="Category" htmlFor="room-post-category">
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="room-post-category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                <div className="flex-1">
                    <Field label="Title" htmlFor="room-post-title">
                        <Input
                            id="room-post-title"
                            variant="form"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What do you want to ask the batch?"
                            maxLength={200}
                        />
                    </Field>
                </div>
            </div>

            <Field label="Body" htmlFor="room-post-body">
                <Textarea
                    id="room-post-body"
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={onBodyKeyDown}
                    placeholder="Share the context, what you tried, what you learned…"
                />
            </Field>

            {error ? <ErrorMessage variant="subtle" message={error} /> : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Enter to post · Shift + Enter for a new line
                </p>
                <Button type="submit" size="sm" disabled={!canPost}>
                    <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
                    {posting ? 'Posting…' : 'Post'}
                </Button>
            </div>
        </form>
    );
}

/** Signed out: the same real sign-in the room header offers, never a disabled form. */
function PostSignInGate() {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sign in to post here and follow the conversation.</p>
            <Button asChild size="sm">
                <Link href="/login">Sign in to post</Link>
            </Button>
        </div>
    );
}

/** Signed in but not a member: offer the join instead of a composer that cannot post. */
function PostJoinGate({ joining, onJoin }: { joining: boolean; onJoin: () => void }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
                Join the room to post here and follow the conversation.
            </p>
            <Button type="button" size="sm" disabled={joining} onClick={onJoin}>
                {joining ? 'Joining…' : 'Join room'}
            </Button>
        </div>
    );
}

export function RoomPosts({
    slug,
    roomId,
    isMember,
    signedIn,
    onJoined,
    onPosted,
}: {
    slug: string;
    roomId: string;
    isMember: boolean;
    signedIn: boolean;
    onJoined: () => Promise<void>;
    onPosted: () => Promise<void>;
}) {
    const [data, setData] = useState<CommunityFeedResult>({
        posts: [], total: 0, page: 1, limit: 20, hasMore: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [joining, setJoining] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listRoomPosts(slug, { page: 1, limit: 50 });
            setData(result);
        } catch {
            if (mounted.current) setError(true);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [slug]);

    // The same fetch without the skeleton flash, used after a post lands so
    // the list updates in place instead of blanking and refilling.
    const refreshQuiet = useCallback(async () => {
        try {
            setData(await communityApi.listRoomPosts(slug, { page: 1, limit: 50 }));
        } catch {
            // Keep the stale list on a transient failure; retry is one click away.
        }
    }, [slug]);

    useEffect(() => { void load(); }, [load]);

    const handleJoin = async () => {
        if (joining) return;
        setJoining(true);
        try {
            await communityApi.joinRoom(slug);
            await onJoined();
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3" aria-hidden="true">
                {[1, 2].map((index) => <RoomPostSkeleton key={index} />)}
            </div>
        );
    }

    if (error) {
        return (
            <ErrorMessage
                variant="card"
                title="Could not load posts"
                message="This room's posts did not load. Try again in a moment."
                onRetry={() => void load()}
            />
        );
    }

    return (
        <div className="space-y-3">
            {isMember ? (
                <PostComposer
                    roomId={roomId}
                    onPosted={async () => {
                        await refreshQuiet();
                        await onPosted();
                    }}
                />
            ) : signedIn ? (
                <PostJoinGate joining={joining} onJoin={() => void handleJoin()} />
            ) : (
                <PostSignInGate />
            )}
            {data.posts.length === 0 ? (
                <EmptyState
                    icon="inbox"
                    size="md"
                    title="No posts in this room yet"
                    description={isMember
                        ? 'Start the first one — ask the batch anything.'
                        : 'Nobody has posted here yet. Members of the room see every post.'}
                    variant="ghost"
                />
            ) : (
                data.posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        detailHref={`/community/${post.id}`}
                        canInteract={isMember}
                    />
                ))
            )}
        </div>
    );
}
