'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    PlusCircleIcon,
    ArrowDownTrayIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';

interface AdminOpportunitiesHeaderProps {
    exportUrl: string;
    /** Tab counts, mirroring the discovery header's live meta line. Optional. */
    counts?: { drafts?: number; published?: number } | null;
}

/**
 * Page header for the listings workspace.
 *
 * Renders inline at the top of the page content (desktop bar on md+,
 * stacked bar below) — exactly like `DiscoveryHeader`. Search is
 * not rendered here: the `DataGrid` below owns the single search input, and
 * refresh lives in that grid's toolbar, so the header only carries the
 * create / review / export actions.
 */
export const AdminOpportunitiesHeader = ({
    exportUrl,
    counts,
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

    const desktopHeaderContent = (
        <div className="hidden md:flex items-center gap-4 w-full animate-in fade-in duration-150">
            <span className="text-lg font-semibold text-foreground shrink-0">Listings</span>
            <div className="ml-auto">{actionButtons}</div>
        </div>
    );

    return (
        <>
            {/* Mobile: in-page bar (the shell header is rebuilt for mobile) */}
            <div className="md:hidden flex flex-col gap-3 pb-3">
                <h1 className="text-xl font-semibold tracking-tight">Listings</h1>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{actionButtons}</div>
            </div>

            {desktopHeaderContent}
        </>
    );
};
