import React from 'react';
import Link from 'next/link';
import { PlusCircleIcon, ArrowPathIcon, DocumentTextIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface AdminOpportunitiesHeaderProps {
    isLoading: boolean;
    onRefresh: () => void;
    exportUrl: string;
}

export const AdminOpportunitiesHeader = ({
    isLoading,
    onRefresh,
    exportUrl
}: AdminOpportunitiesHeaderProps) => {
    return (
        <div className="hidden md:flex items-center justify-between gap-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Listings</h1>
                <p className="text-sm text-muted-foreground">Manage listings and keep the feed accurate.</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onRefresh}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-secondary/20 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="Refresh List"
                >
                    <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                <a
                    href={exportUrl}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-secondary/20 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    Share Link
                </a>
                <Link href="/admin/opportunities?status=DRAFT" className="inline-flex h-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/5 px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/10">
                    <ExclamationCircleIcon className="w-4 h-4 mr-2" />
                    Review Queue
                </Link>
                <Link href="/admin/opportunities/create" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    <PlusCircleIcon className="w-4 h-4 mr-2" />
                    New listing
                </Link>
            </div>
        </div>
    );
};
