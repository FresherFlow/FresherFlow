'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import type { Opportunity } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFeedHeader } from '@/lib/providers/FeedHeaderProvider';
import { useOpportunitiesFeed } from '@/features/jobs/hooks/useOpportunitiesFeed';
import { JobCardResponsive } from '@/features/jobs/components/JobCard';
import { OpportunityRow } from '@/features/jobs/components/OpportunityRow';
import { getOpportunityPathFromItem } from '@/features/jobs/domain/opportunityPath';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { PersonalizationBar } from '@/features/jobs/components/PersonalizationBar';
import { SkeletonJobCard } from '@/features/jobs/components/OpportunitySkeletons';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { EmptyState } from '@/ui/EmptyState';

/**
 * "For You" tab on /jobs — a match-ranked feed, distinct from the All feed.
 *
 * All feed (/jobs default): newest-first, no personalization, full filter bar.
 * This feed: sorted by profile match score (skills, education, batch year),
 * not-eligible roles sink to the bottom, newer listings break ties. Hydrates
 * from the same CDN feed as everything else — no separate server cache.
 *
 * Desktop renders the same `OpportunityRow` the Split view sidebar uses, a page
 * at a time. It used to render every ranked match at once as a full card tree,
 * which is the same cost the List view was paying (hidden measurement strip,
 * ResizeObserver, a layout pass per card, an icon load per skill) multiplied by
 * the whole feed.
 */
export default function ForYouTab() {
    const router = useRouter();
    const { user } = useAuth();
    const { setCount } = useFeedHeader();
    const { filteredOpps, isLoading, error, toggleSave, reload, profileMismatchCount, showHiddenProfile, setShowHiddenProfile } = useOpportunitiesFeed({
        sort: 'match',
        showOnlySaved: false,
        closingSoon: false,
        search: '',
        personalize: true,
    });

    useEffect(() => {
        setCount(filteredOpps.length);
        return () => setCount(null);
    }, [filteredOpps.length, setCount]);

    // A page at a time, like the All feed. The tab used to map over every match.
    const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
    const { targetRef: loadMoreRef, isIntersecting } = useIntersectionObserver({ threshold: 0.1, rootMargin: '400px' });

    useEffect(() => {
        if (isIntersecting && visibleCount < filteredOpps.length) {
            setVisibleCount((prev) => Math.min(prev + FEED_PAGE_SIZE, filteredOpps.length));
        }
    }, [isIntersecting, visibleCount, filteredOpps.length]);

    // Same breakpoint JobCardResponsive switches on, so exactly one card tree is
    // ever mounted on the mobile side and the desktop side never mounts one.
    // Null until mount: the breakpoint is unknown during SSR, and guessing would
    // mismatch the server HTML.
    const [isRowLayout, setIsRowLayout] = useState<boolean | null>(null);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 48rem)');
        const update = () => setIsRowLayout(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    // "Matched" has to mean something. This used to print `filteredOpps.length`,
    // the size of the whole feed — the same number the All Jobs tab shows, next
    // to a heading that implies the listings were selected for you. Most of that
    // feed is *eligible*, which is not the same as a match, and on a profile with
    // no overlapping skills every score is 0 while the count still read 519.
    const matchCount = filteredOpps.filter((opp) => (opp.matchScore ?? 0) > 0).length;
    const hasProfileScores = matchCount > 0;

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            <header className="space-y-2 pb-4 border-b border-border/40">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">For You</h1>
                    {hasProfileScores ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-2.5 py-0.5 tabular-nums">
                            {matchCount} of {filteredOpps.length} match you
                        </span>
                    ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-muted/60 border border-border/60 text-muted-foreground text-xs font-semibold px-2.5 py-0.5">
                            Newest first
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    Ranked by profile fit — your skills, education and batch year decide the order, newer
                    listings break ties, and roles you are not eligible for sink to the bottom.{' '}
                    <Link href="/jobs" className="font-semibold text-primary hover:underline">
                        All jobs
                    </Link>{' '}
                    stays strictly newest-first with no personalization.
                </p>
                {!hasProfileScores && !isLoading && (
                    <p className="text-xs font-semibold text-muted-foreground">
                        Match scores appear once your profile is complete — until then this feed falls back to newest first.
                    </p>
                )}
            </header>

            {/* Profile chips + the "N don't match your profile" disclosure. */}
            <PersonalizationBar
                mismatchCount={profileMismatchCount}
                showHidden={showHiddenProfile}
                onToggleShow={() => setShowHiddenProfile((value) => !value)}
            />

            {isLoading && filteredOpps.length === 0 ? (
                <div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                    role="status"
                    aria-label="Loading your feed"
                >
                    {Array.from({ length: 6 }).map((_, index) => (
                        <SkeletonJobCard key={index} variant="wide" />
                    ))}
                </div>
            ) : error ? (
                <ErrorMessage
                    title="Your feed is unavailable"
                    message={error}
                    onRetry={reload}
                    variant="card"
                />
            ) : filteredOpps.length === 0 ? (
                <EmptyState
                    title="No matches yet"
                    description="Once your profile is complete, your best-fit openings show up here first."
                    icon="inbox"
                    action={
                        <Link
                            href="/jobs"
                            className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 ease-out shadow-sm"
                        >
                            Browse all jobs →
                        </Link>
                    }
                />
            ) : (
                <>
                <div
                    className={cn(
                        'grid grid-cols-1 gap-4 md:gap-6',
                        isRowLayout === true ? 'gap-0 divide-y divide-border/60' : 'md:grid-cols-2'
                    )}
                    role="list"
                    aria-label="Recommended opportunities"
                >
                    {filteredOpps.slice(0, visibleCount).map((opp, index) => (
                        <div key={opp.id} role="listitem" className="min-w-0 space-y-1.5">
                            {(opp.matchScore ?? 0) > 0 && (
                                <div className="flex items-center gap-2 min-w-0 text-xs">
                                    <span className="shrink-0 inline-flex items-center rounded-full bg-success/10 border border-success/20 text-success px-2 py-0.5 font-bold tabular-nums">
                                        {opp.matchScore}% match
                                    </span>
                                    <span className="truncate text-muted-foreground font-medium">
                                        {opp.matchReason}
                                    </span>
                                </div>
                            )}
                            {isRowLayout === true ? (
                                <OpportunityRow
                                    opp={opp}
                                    isSaved={opp.isSaved || false}
                                    onToggleSave={() => toggleSave(opp.id)}
                                    onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                />
                            ) : (
                            <JobCardResponsive
                                job={
                                    {
                                        ...opp,
                                        normalizedRole: opp.title,
                                        salary:
                                            opp.salaryMin !== undefined && opp.salaryMax !== undefined
                                                ? { min: opp.salaryMin, max: opp.salaryMax }
                                                : undefined,
                                    } as Opportunity
                                }
                                jobId={opp.id}
                                isSaved={opp.isSaved || false}
                                onToggleSave={() => toggleSave(opp.id)}
                                isAdmin={user?.role === 'ADMIN'}
                                priority={index < 4}
                                variant="wide"
                                className="bg-card/60 border-border/60 shadow-sm hover:shadow"
                            />
                            )}
                        </div>
                    ))}
                </div>
                {visibleCount < filteredOpps.length && (
                    <div ref={loadMoreRef} className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                )}
                </>
            )}
        </div>
    );
}
