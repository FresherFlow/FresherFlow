'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Option { label: string; value: string }

interface SelectProps {
    value: string;
    onChange: (v: string) => void;
    options: Option[];
    className?: string;
}

function Select({ value, onChange, options, className = '' }: SelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find(o => o.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="h-9 w-full flex items-center justify-between gap-2 rounded-md border border-input bg-secondary/20 px-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                <span className="truncate">{current.label}</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 left-0 min-w-full w-max rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <CheckIcon className={`w-3.5 h-3.5 shrink-0 ${value === opt.value ? 'text-primary' : 'invisible'}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface AdminOpportunitiesFiltersProps {
    search: string;
    setSearch: (v: string) => void;
    typeFilter: string;
    setTypeFilter: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
    sort: string;
    setSort: (v: string) => void;
    onClear: () => void;
}

const TYPE_OPTIONS: Option[] = [
    { value: '', label: 'All types' },
    { value: 'JOB', label: 'Jobs' },
    { value: 'INTERNSHIP', label: 'Internships' },
    { value: 'WALKIN', label: 'Walk-ins' },
    { value: 'GOVERNMENT', label: 'Govt Jobs' },
];

const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'All status' },
    { value: 'LIVE', label: 'Live' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'ARCHIVED', label: 'Archived' },
    { value: 'DELETED', label: 'Deleted' },
];

const SORT_OPTIONS: Option[] = [
    { value: 'postedAt_desc', label: 'Newest' },
    { value: 'postedAt_asc', label: 'Oldest' },
    { value: 'company_asc', label: 'A–Z' },
    { value: 'company_desc', label: 'Z–A' },
];

export const AdminOpportunitiesFilters = ({
    search, setSearch,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    sort, setSort,
    onClear,
}: AdminOpportunitiesFiltersProps) => {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3 w-full">
            <div className="relative flex-1 w-full">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    placeholder="Search listings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 flex-1 md:flex-initial overflow-x-auto pb-1 md:pb-0 custom-scrollbar md:overflow-visible">
                    <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1 shrink-0">
                        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                        Filters
                    </div>

                    <div className="w-[120px] shrink-0 md:w-36">
                        <Select value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
                    </div>
                    <div className="w-[110px] shrink-0 md:w-32">
                        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
                    </div>
                    <div className="w-[100px] shrink-0 md:w-28">
                        <Select value={sort} onChange={setSort} options={SORT_OPTIONS} />
                    </div>
                </div>

                <button
                    onClick={onClear}
                    className="h-9 px-3 shrink-0 rounded-md border border-input bg-secondary/20 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};
