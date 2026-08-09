'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronDownIcon, CheckIcon, XMarkIcon,
    TrashIcon, ArchiveBoxIcon, ArrowUpCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';

// ─── Tiny Select ─────────────────────────────────────────────────────────────
interface Option { label: string; value: string }

function Select({ value, onChange, options, className = '' }: { value: string; onChange: (v: string) => void; options: Option[]; className?: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find(o => o.value === value) ?? options[0];
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
        <div ref={ref} className={`relative ${className}`}>
            <Button variant="admin" size="sm" type="button" onClick={() => setOpen(o => !o)}
                className="h-9 w-full flex items-center justify-between gap-1.5 px-3 font-medium">
                <span className="truncate">{current.label}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
            {open && (
                <div className="absolute z-50 mt-1 left-0 min-w-full w-max rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    {options.map(opt => (
                        <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors">
                            <CheckIcon className={`w-3.5 h-3.5 shrink-0 ${value === opt.value ? 'text-primary' : 'invisible'}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const TYPE_OPTIONS: Option[] = [
    { value: '', label: 'All types' }, { value: 'JOB', label: 'Jobs' },
    { value: 'INTERNSHIP', label: 'Internships' }, { value: 'WALKIN', label: 'Walk-ins' },
    { value: 'GOVERNMENT', label: 'Govt Jobs' },
];
const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'All status' }, { value: 'LIVE', label: 'Live' },
    { value: 'DRAFT', label: 'Draft' }, { value: 'EXPIRED', label: 'Expired' },
    { value: 'ARCHIVED', label: 'Archived' }, { value: 'DELETED', label: 'Deleted' },
];
const SORT_OPTIONS: Option[] = [
    { value: 'postedAt_desc', label: 'Newest' }, { value: 'postedAt_asc', label: 'Oldest' },
    { value: 'company_asc', label: 'A–Z' }, { value: 'company_desc', label: 'Z–A' },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface FilterProps {
    typeFilter: string; setTypeFilter: (v: string) => void;
    statusFilter: string; setStatusFilter: (v: string) => void;
    sort: string; setSort: (v: string) => void;
    onClear: () => void;
}


// ─── ONE ROW: [bulk left] .............. [dropdowns right] ────────────────────
export const AdminOpportunitiesFilters = ({
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    sort, setSort,
    onClear,
    // bulk props passed through from page
    selectedCount = 0,
    bulkActionPending = false,
    bulkActionLabel = '',
    onBulkAction,
    onBulkClear,
}: FilterProps & { selectedCount?: number; bulkActionPending?: boolean; bulkActionLabel?: string; onBulkAction?: (a: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE') => void; onBulkClear?: () => void }) => (
    <div className="flex items-center gap-2 flex-wrap w-full">
        {/* LEFT: bulk actions (only when selected) */}
        {selectedCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-150">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{selectedCount}</span>
                <span className="text-sm font-medium text-primary whitespace-nowrap mr-1">selected</span>
                {bulkActionPending && <span className="text-xs text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />{bulkActionLabel}...</span>}
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('PUBLISH')} disabled={bulkActionPending}
                    className="h-7 px-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors bg-card">
                    <ArrowUpCircleIcon className="w-3.5 h-3.5" /> Publish
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('EXPIRE')} disabled={bulkActionPending}
                    className="h-7 px-2.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors bg-card">
                    <ClockIcon className="w-3.5 h-3.5" /> Expire
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('ARCHIVE')} disabled={bulkActionPending}
                    className="h-7 px-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-card">
                    <ArchiveBoxIcon className="w-3.5 h-3.5" /> Archive
                </Button>
                <Button variant="outline" size="sm" onClick={() => onBulkAction?.('DELETE')} disabled={bulkActionPending}
                    className="h-7 px-2.5 flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors bg-card">
                    <TrashIcon className="w-3.5 h-3.5" /> Delete
                </Button>
                <button onClick={onBulkClear} disabled={bulkActionPending}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50">
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-5 bg-border" />
            </div>
        )}

        {/* RIGHT: filter dropdowns push to end */}
        <div className="flex items-center gap-2 ml-auto">
            <Select value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} className="w-32" />
            <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} className="w-28" />
            <Select value={sort} onChange={setSort} options={SORT_OPTIONS} className="w-28" />
            {(typeFilter || statusFilter || sort !== 'postedAt_desc') && (
                <Button variant="admin" size="sm" onClick={onClear} className="h-9 px-3 text-xs font-medium">
                    Clear
                </Button>
            )}
        </div>
    </div>
);

