'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { PlusCircleIcon, ArrowPathIcon, DocumentTextIcon, ExclamationCircleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/Button';

interface AdminOpportunitiesHeaderProps {
    isLoading: boolean;
    onRefresh: () => void;
    exportUrl: string;
    search: string;
    setSearch: (v: string) => void;
}

export const AdminOpportunitiesHeader = ({
    isLoading,
    onRefresh,
    exportUrl,
    search,
    setSearch
}: AdminOpportunitiesHeaderProps) => {
    const [headerTarget, setHeaderTarget] = useState<Element | null>(null);
    useEffect(() => { setHeaderTarget(document.getElementById('top-header-portal-target')); }, []);

    const router = useRouter();

    const actionButtons = (
        <div className="flex items-center gap-2 shrink-0">
            <Button variant="admin" size="sm" onClick={onRefresh} className="hidden md:flex h-9 text-xs px-3 py-2 items-center gap-1.5">
                <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="admin" size="sm" onClick={() => window.location.href = exportUrl} className="hidden md:flex h-9 text-xs px-3 py-2 items-center gap-1.5">
                <DocumentTextIcon className="w-4 h-4" /> Share Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/opportunities?status=DRAFT')} className="hidden md:flex h-9 text-xs px-3 py-2 items-center gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
                <ExclamationCircleIcon className="w-4 h-4" /> Review Queue
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/opportunities/create')} className="h-9 text-xs px-3 py-2 flex items-center gap-1.5">
                <PlusCircleIcon className="w-4 h-4" /> New listing
            </Button>
        </div>
    );

    // 1. Mobile Search Bar (rendered inline)
    const mobileSearch = (
        <div className="relative w-full max-w-xs md:hidden">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
                placeholder="Search listings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 w-full rounded-md border border-input bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground">
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    // 2. Desktop Header Portal Content
    const headerPortalContent = (
        <div className="hidden md:flex items-center gap-4 w-full animate-in fade-in duration-200">
            <span className="text-lg font-semibold text-foreground shrink-0">Listings</span>
            
            <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    placeholder="Search listings..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 w-full rounded-md border border-input bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground">
                        <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="ml-auto">{actionButtons}</div>
        </div>
    );

    return (
        <>
            {/* Mobile View */}
            <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border md:hidden">
                <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
                {mobileSearch}
            </div>

            {/* Desktop Portal */}
            {headerTarget && createPortal(headerPortalContent, headerTarget)}
        </>
    );
};
