'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { MySubmissionItem, MySubmissionsResult, SubmissionViewState } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';

const STATE_CHIP: Record<SubmissionViewState, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
    PENDING: { label: 'Pending', variant: 'warning' },
    LIVE: { label: 'Live', variant: 'success' },
    REJECTED: { label: 'Rejected', variant: 'destructive' },
    MERGED: { label: 'Merged', variant: 'secondary' },
};

function formatWhen(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

export function ContributionHistory({ onContribute, refreshKey }: { onContribute?: () => void; refreshKey?: number }) {
    const { user } = useAuth();
    const [items, setItems] = useState<MySubmissionItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const result = await communityApi.listMySubmissions();
            setItems(result.submissions);
        } catch {
            setError('Could not load your submissions.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    if (!user) {
        return (
            <EmptyState
                title="Sign in to track your submissions"
                description="Your shares, their review status, and what got published — all in one place."
                icon="inbox"
                action={<Button onClick={onContribute}>Contribute something</Button>}
            />
        );
    }

    if (loading && items === null) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={() => void load()} />;
    }

    if (!items || items.length === 0) {
        return (
            <EmptyState
                title="Nothing shared yet"
                description="Share a job, a walk-in drive, or your interview experience. Everything you share shows up here with its status."
                icon="inbox"
                action={onContribute ? <Button onClick={onContribute}>Contribute something</Button> : undefined}
            />
        );
    }

    return (
        <ul className="space-y-3">
            {items.map((item) => {
                const chip = STATE_CHIP[item.viewState];
                return (
                    <li
                        key={item.id}
                        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={chip.variant}>{chip.label}</Badge>
                                <span className="text-xs text-muted-foreground">{formatWhen(item.createdAt)}</span>
                            </div>
                            <p className="truncate text-sm font-semibold text-foreground">
                                {item.title}
                                {item.company ? <span className="font-normal text-muted-foreground"> · {item.company}</span> : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{item.sourceLink}</p>

                            {item.viewState === 'REJECTED' && item.rejectionReason ? (
                                <p className="rounded-lg bg-destructive/10 px-2 py-1 text-xs text-destructive">
                                    Reason: {item.rejectionReason}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {item.viewState === 'LIVE' && item.slug ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/jobs/${item.slug}`}>View listing</Link>
                                </Button>
                            ) : null}
                            {item.viewState === 'MERGED' && item.mergedTargetSlug ? (
                                <>
                                    <span className="text-xs text-muted-foreground">Your find, already here</span>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/jobs/${item.mergedTargetSlug}`}>Open</Link>
                                    </Button>
                                </>
                            ) : null}
                            {item.viewState === 'REJECTED' && item.sourceLink ? (
                                <Button asChild variant="outline" size="sm">
                                    <a href={`/contribute?type=JOB&source=${encodeURIComponent(item.sourceLink)}`}>Resubmit</a>
                                </Button>
                            ) : null}
                            {item.viewState === 'PENDING' ? (
                                <span className="text-xs text-muted-foreground">In review</span>
                            ) : null}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export type { MySubmissionsResult };
