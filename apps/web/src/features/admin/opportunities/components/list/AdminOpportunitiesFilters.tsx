'use client';

import React from 'react';
import {
    XMarkIcon,
    TrashIcon, ArchiveBoxIcon, ArrowUpCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/Select';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AdminOpportunitiesFilterOption {
    value: string;
    label: string;
}

interface FilterProps {
    typeFilter: string; setTypeFilter: (v: string) => void;
    statusFilter: string; setStatusFilter: (v: string) => void;
    sort: string; setSort: (v: string) => void;
    onClear: () => void;
    /** Options are owned by the caller (see `columns.tsx` / `statuses.tsx`). */
    typeOptions: AdminOpportunitiesFilterOption[];
    statusOptions: AdminOpportunitiesFilterOption[];
    sortOptions: AdminOpportunitiesFilterOption[];
    selectedCount?: number;
    bulkActionPending?: boolean;
    bulkActionLabel?: string;
    onBulkAction?: (a: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE') => void;
    onBulkClear?: () => void;
}


// ─── ONE ROW: [bulk left] .............. [dropdowns right] ────────────────────
/**
 * Toolbar above the listings grid. Same shape as the discovery tab toolbars:
 * the DataGrid owns search + row count, this strip owns faceting and bulk
 * actions. Bulk controls stay disabled while a request is in flight and the
 * pending label is surfaced next to the selection count.
 */
export const AdminOpportunitiesFilters = ({
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    sort, setSort,
    onClear,
    typeOptions, statusOptions, sortOptions,
    selectedCount = 0,
    bulkActionPending = false,
    bulkActionLabel = '',
    onBulkAction,
    onBulkClear,
}: FilterProps) => {
    const isDirty =
        Boolean(typeFilter) || Boolean(statusFilter) || sort !== (sortOptions[0]?.value ?? 'postedAt_desc');

    return (
    <div className="flex items-center gap-2 flex-wrap w-full">
        {/* LEFT: bulk actions (only when selected) */}
        {selectedCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-150">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">{selectedCount}</span>
                <span className="text-sm font-medium text-primary whitespace-nowrap mr-1">selected</span>
                {bulkActionPending && <span className="text-xs text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{bulkActionLabel || 'working'}...</span>}
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('PUBLISH')} disabled={bulkActionPending}>
                    <ArrowUpCircleIcon className="w-3.5 h-3.5 mr-1" /> Publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('EXPIRE')} disabled={bulkActionPending}>
                    <ClockIcon className="w-3.5 h-3.5 mr-1" /> Expire
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('ARCHIVE')} disabled={bulkActionPending}>
                    <ArchiveBoxIcon className="w-3.5 h-3.5 mr-1" /> Archive
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('DELETE')} disabled={bulkActionPending}>
                    <TrashIcon className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
                <button
                    type="button"
                    onClick={onBulkClear}
                    disabled={bulkActionPending}
                    aria-label="Clear selection"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
                <div className="hidden sm:block w-px h-5 bg-border" />
            </div>
        )}

        {/* RIGHT: facet dropdowns push to the end */}
        <div className="flex items-center gap-2 ml-auto">
            <Select value={typeFilter || 'ALL'} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="h-9 w-auto min-w-28 cursor-pointer text-xs" aria-label="Filter by type">
                    <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                    {typeOptions.map((option) => (
                        <SelectItem key={option.value || 'ALL'} value={option.value || 'ALL'}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={statusFilter || 'ALL'} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
                <SelectTrigger className="h-9 w-auto min-w-28 cursor-pointer text-xs" aria-label="Filter by status">
                    <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map((option) => (
                        <SelectItem key={option.value || 'ALL'} value={option.value || 'ALL'}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 w-auto min-w-28 cursor-pointer text-xs" aria-label="Sort listings">
                    <SelectValue placeholder="Newest" />
                </SelectTrigger>
                <SelectContent>
                    {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isDirty && (
                <Button variant="admin" size="sm" onClick={onClear} className={cn(bulkActionPending && 'pointer-events-none opacity-60')}>
                    Clear
                </Button>
            )}
        </div>
    </div>
    );
};

