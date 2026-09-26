'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    PlusCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    ExclamationCircleIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';

interface AdminOpportunitiesHeaderProps {
    isLoading: boolean;
    onRefresh: () => void;
    exportUrl: string;
    search: string;
    setSearch: (v: string) => void;
    /** Tab counts, mirroring the discovery header's live meta line. Optional. */
    counts?: { drafts?: number; published?: number } | null;
}

/**
 * Page header for the listings workspace.
 *
 * Portals the desktop bar into the shell header (`#top-header-portal-target`)
 * and renders an inline mobile bar, exactly like `DiscoveryHeader`. Search is
 * owned by the page (URL-synced) and passed down, so there is a single source
 * of truth for the query.
 */
export const AdminOpportunitiesHeader = ({
    isLoading,
    onRefresh,
    exportUrl,
    search,
    setSearch,
    counts,
}: AdminOpportunitiesHeaderProps) => {
    const [headerTarget, setHeaderTarget] = useState<Element | null>(null);
    const router = useRouter();

    useEffect(() => {
        setHeaderTarget(document.getElementById('top-header-portal-target'));
    }, []);

    const searchInput = (
        <div className="relative w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                variant="search"
                className="pl-9 pr-8 h-9 bg-muted/50"
            />
            {search && (
                <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    const actionButtons = (
        <div className="flex items-center gap-2 shrink-0">
            <Button variant="admin" size="sm" onClick={onRefresh} title="Refresh">
                <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline ml-1.5">Refresh</span>
            </Button>
            <Button variant="admin" size="sm" onClick={() => { window.location.href = exportUrl; }} title="Download share link">
                <DocumentTextIcon className="w-4 h-4" />
                <span className="hidden xl:inline ml-1.5">Share link</span>
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
            <div className="flex-1 max-w-md">{searchInput}</div>
            <div className="ml-auto">{actionButtons}</div>
        </div>
    );

    return (
        <>
            {/* Mobile: in-page bar (the shell header is rebuilt for mobile) */}
            <div className="md:hidden flex flex-col gap-3 pb-3">
                <h1 className="text-xl font-semibold tracking-tight">Listings</h1>
                {searchInput}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{actionButtons}</div>
            </div>

            {headerTarget && createPortal(desktopHeaderContent, headerTarget)}
        </>
    );
};
