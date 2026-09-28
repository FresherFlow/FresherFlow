'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    PlusCircleIcon,
    ArrowDownTrayIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';

interface AdminOpportunitiesHeaderProps {
    exportUrl: string;
    /** Tab counts, mirroring the discovery header's live meta line. Optional. */
    counts?: { drafts?: number; published?: number } | null;
    /** Reload the listings query. Lives here as a page action, not in the grid. */
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

/**
 * Page header for the listings workspace.
 *
 * Carries page-level ACTIONS only: export, refresh, review queue, create.
 *
 * It deliberately renders no title. `TopHeaderBar` (desktop) and
 * `MobileTopNav` (mobile) both already print the route name, so this component
 * adding its own "Listings" made the word appear twice on every screen. Search
 * lives in the `DataGrid` below, which owns the single search input, and
 * refresh moved here from that grid's toolbar so the table row is filters only.
 */
export const AdminOpportunitiesHeader = ({
    exportUrl,
    counts,
    onRefresh,
    isRefreshing,
}: AdminOpportunitiesHeaderProps) => {
    const router = useRouter();

    const actionButtons = (
        <div className="flex items-center gap-2 shrink-0">
            <Button
                variant="admin"
                size="sm"
                onClick={() => { window.location.href = exportUrl; }}
                title="Download listings export"
                aria-label="Download listings export"
            >
                <ArrowDownTrayIcon className="w-4 h-4" />
            </Button>
            {onRefresh && (
                <Button
                    variant="admin"
                    size="sm"
                    onClick={onRefresh}
                    title="Refresh listings"
                    aria-label="Refresh listings"
                >
                    <ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/opportunities?status=DRAFT')} title="Review draft queue">
                <ExclamationCircleIcon className="w-4 h-4" />
                <span className="hidden xl:inline ml-1.5">Review queue</span>
                {counts?.drafts ? (
                    <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-xs font-bold text-warning dark:text-warning tabular-nums">
                        {counts.drafts}
                    </span>
                ) : null}
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/opportunities/create')}>
                <PlusCircleIcon className="w-4 h-4 mr-1.5" /> New listing
            </Button>
        </div>
    );

    /* Actions only on both breakpoints. `TopHeaderBar` renders the route title
       on desktop and `MobileTopNav` renders it on mobile, so this component
       adding its own "Listings" printed the word twice on every screen. */
    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar md:overflow-visible">
            {actionButtons}
        </div>
    );
};
