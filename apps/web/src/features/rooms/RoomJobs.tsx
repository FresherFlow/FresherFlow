'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    EllipsisVerticalIcon,
    ArrowUturnLeftIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { communityApi } from '@fresherflow/api-client';
import { AlertDialog } from '@/ui/AlertDialog';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import { Skeleton } from '@/ui/Skeleton';
import type { RoomJobRow } from './roomShared';

function RoomJobSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    );
}

// Deliberately shared opportunities, not posts. RoomOpportunity rows are
// created ONLY by member share / moderator pin (server phase 9). Tags never
// surface jobs here.

export function RoomJobs({
    slug,
    isMember,
    canModerate,
    viewerId,
    onMemberChange,
}: {
    slug: string;
    isMember: boolean;
    canModerate: boolean;
    viewerId: string | null;
    onMemberChange: () => Promise<void>;
}) {
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<RoomJobRow[]>([]);
    const [error, setError] = useState(false);
    const [actingId, setActingId] = useState<string | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<RoomJobRow | null>(null);
    const [shareUrl, setShareUrl] = useState('');
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareSubmitUrl, setShareSubmitUrl] = useState<string | null>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listRoomOpportunities(slug, { page: 1, limit: 50 });
            setJobs(result.opportunities ?? []);
        } catch {
            if (mounted.current) setError(true);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [slug]);

    // One call, then a client split. The endpoint already orders PINNED before
    // SHARED (enum order, then newest first), so a single response is a superset
    // of both `?reason=` calls: no second request on a rate-limited public
    // endpoint, and a long tail of shared rows can never push a curated pin
    // out of the page.
    const refreshQuiet = useCallback(async () => {
        try {
            const result = await communityApi.listRoomOpportunities(slug, { page: 1, limit: 50 });
            setJobs(result.opportunities ?? []);
        } catch {
            // Keep the stale list; the mutation already succeeded server-side.
        }
    }, [slug]);

    useEffect(() => { void load(); }, [load]);

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
            await refreshQuiet();
            await onMemberChange();
        } catch (e) {
            const status = (e as { status?: number })?.status;
            if (status === 403) {
                setShareError('Only members can share — join the room first.');
                await onMemberChange();
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

    const handlePin = async (opportunityId: string) => {
        if (actingId) return;
        setActingId(opportunityId);
        setShareError(null);
        try {
            await communityApi.pinRoomOpportunity(slug, opportunityId);
            await refreshQuiet();
            await onMemberChange();
        } catch (e) {
            setShareError(e instanceof Error ? e.message : 'Could not pin this job.');
        } finally {
            setActingId(null);
        }
    };

    const handleRemove = async () => {
        const target = pendingRemoval;
        if (!target || actingId) return;
        setPendingRemoval(null);
        setActingId(target.opportunity.id);
        setShareError(null);
        try {
            await communityApi.removeRoomOpportunity(slug, target.opportunity.id);
            await refreshQuiet();
            await onMemberChange();
        } catch (e) {
            setShareError(e instanceof Error ? e.message : 'Could not remove this job.');
        } finally {
            setActingId(null);
        }
    };

    // Mirrors the server rule exactly: a moderator may remove anything, and a
    // member may remove only the SHARED row they added themselves.
    const canRemove = (item: RoomJobRow) =>
        canModerate || (isMember && item.reason === 'SHARED' && !!viewerId && item.addedBy?.id === viewerId);

    const pinnedItems = useMemo(() => jobs.filter((j) => j.reason === 'PINNED'), [jobs]);
    const sharedItems = useMemo(() => jobs.filter((j) => j.reason === 'SHARED'), [jobs]);

    if (loading) {
        return (
            <div className="space-y-3" aria-hidden="true">
                {[1, 2].map((index) => <RoomJobSkeleton key={index} />)}
            </div>
        );
    }
    if (error) {
        return (
            <ErrorMessage
                variant="card"
                title="Could not load jobs"
                message="The openings shared in this room did not load. Try again in a moment."
                onRetry={() => void load()}
            />
        );
    }

    const renderItem = (item: RoomJobRow) => (
        <RoomJobCard
            key={`${item.opportunity.id}-${item.reason}`}
            item={item}
            canPin={canModerate}
            canRemove={canRemove(item)}
            acting={actingId === item.opportunity.id}
            onPin={() => void handlePin(item.opportunity.id)}
            onRequestRemove={() => setPendingRemoval(item)}
        />
    );

    return (
        <div className="space-y-3">
            {isMember ? (
                <div className="rounded-xl border border-border bg-card p-3">
                    <form
                        onSubmit={(event) => { event.preventDefault(); void handleShare(); }}
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    >
                        <div className="flex-1">
                            <Field label="Share an opening" htmlFor="room-share-url">
                                <Input
                                    id="room-share-url"
                                    variant="form"
                                    value={shareUrl}
                                    onChange={(e) => {
                                        setShareUrl(e.target.value);
                                        setShareSubmitUrl(null);
                                    }}
                                    placeholder="Paste a job link to share it here…"
                                />
                            </Field>
                        </div>
                        <Button type="submit" size="sm" disabled={sharing || !shareUrl.trim()}>
                            {sharing ? 'Sharing…' : 'Share'}
                        </Button>
                    </form>
                    {shareError ? <ErrorMessage variant="subtle" message={shareError} className="mt-2" /> : null}
                    {shareSubmitUrl ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button asChild size="sm">
                                <Link href="/contribute">Submit it for review</Link>
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                It can be shared here once approved.
                            </span>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {jobs.length === 0 ? (
                <EmptyState
                    icon="inbox"
                    size="md"
                    title="No job listings in this room yet"
                    description={isMember ? 'Share the first opening — batchmates see it here.' : 'Join the room to share openings with the batch.'}
                    variant="ghost"
                />
            ) : (
                <>
                    {pinnedItems.length > 0 ? (
                        <section className="space-y-2">
                            <h2 className="px-1 text-base font-semibold text-foreground">Pinned by moderators</h2>
                            {pinnedItems.map(renderItem)}
                        </section>
                    ) : null}
                    {sharedItems.length > 0 ? (
                        <section className="space-y-2">
                            <h2 className="px-1 text-base font-semibold text-foreground">Shared by members</h2>
                            {sharedItems.map(renderItem)}
                        </section>
                    ) : null}
                </>
            )}

            <AlertDialog
                show={!!pendingRemoval}
                title="Remove this job?"
                message={pendingRemoval
                    ? `"${pendingRemoval.opportunity.title}" comes off this room's job list. The listing stays on FresherFlow, and anyone in the room can share it again.`
                    : ''}
                confirmText="Remove"
                type="danger"
                onConfirm={() => void handleRemove()}
                onCancel={() => setPendingRemoval(null)}
            />
        </div>
    );
}

function RoomJobCard({
    item,
    canPin,
    canRemove,
    acting,
    onPin,
    onRequestRemove,
}: {
    item: RoomJobRow;
    canPin: boolean;
    canRemove: boolean;
    acting: boolean;
    onPin: () => void;
    onRequestRemove: () => void;
}) {
    const { opportunity: job, reason, addedBy } = item;
    return (
        <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={`/jobs/${job.slug}`}
                    className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                >
                    {job.title}
                </Link>
                <Badge variant={reason === 'PINNED' ? 'default' : 'muted'} size="sm" className="shrink-0">
                    {reason === 'PINNED' ? 'Pinned' : 'Shared'}
                </Badge>
                {canPin || canRemove ? (
                    <div className="shrink-0">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={acting}
                                    aria-label={`Actions for ${job.title}`}
                                >
                                    <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canPin && reason === 'SHARED' ? (
                                    <DropdownMenuItem onSelect={onPin}>
                                        <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
                                        Pin to top
                                    </DropdownMenuItem>
                                ) : null}
                                {canRemove ? (
                                    <>
                                        {canPin && reason === 'SHARED' ? <DropdownMenuSeparator /> : null}
                                        <DropdownMenuItem onSelect={onRequestRemove}>
                                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                            Remove from room
                                        </DropdownMenuItem>
                                    </>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
                {job.company}
                {job.locations?.length ? ` · ${job.locations.join(', ')}` : ''}
                {job.salaryRange ? ` · ${job.salaryRange}` : ''}
            </p>
            {addedBy ? (
                <p className="mt-1 text-sm text-muted-foreground">
                    Shared by {addedBy.fullName || addedBy.username || 'a member'}
                </p>
            ) : null}
        </div>
    );
}
