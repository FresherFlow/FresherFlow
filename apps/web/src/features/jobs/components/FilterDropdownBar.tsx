'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';

const LOCATIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Remote'];

const SALARY_OPTIONS: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '3L+', value: 300000 },
    { label: '6L+', value: 600000 },
    { label: '10L+', value: 1000000 },
    { label: '15L+', value: 1500000 },
];

export interface FilterBarFilters {
    location: string | null;
    salary: number | null;
    closingSoon: boolean;
    saved: boolean;
}

interface FilterDropdownBarProps {
    filters: FilterBarFilters;
    setFilters: (f: FilterBarFilters) => void;
    isLoggedIn: boolean;
    // Optional: type selector (only on /opportunities page)
    selectedType?: string | null;
    onTypeChange?: (type: string | null) => void;
}

type OpenPanel = 'location' | 'salary' | 'type' | null;

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
    useEffect(() => {
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

const chipBase = 'h-9 px-3.5 rounded-xl border text-[12px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap select-none';
const chipDefault = 'bg-background border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground';
const chipActive = 'bg-primary/10 text-primary border-primary/30';

export function FilterDropdownBar({ filters, setFilters, isLoggedIn, selectedType, onTypeChange }: FilterDropdownBarProps) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const barRef = useRef<HTMLDivElement>(null);

    useClickOutside(barRef, () => setOpen(null));

    // Close on scroll
    useEffect(() => {
        const onScroll = () => setOpen(null);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const toggle = (panel: OpenPanel) =>
        setOpen(prev => (prev === panel ? null : panel));

    const hasAnyFilter = !!(filters.location || filters.salary || filters.closingSoon || filters.saved);

    const salaryLabel = SALARY_OPTIONS.find(o => o.value === filters.salary)?.label ?? 'Any';

    return (
        <div ref={barRef} className="hidden lg:flex items-center gap-2 flex-wrap">

            {/* Type dropdown — only when prop provided */}
            {onTypeChange && (
                <div className="relative">
                    <button
                        onClick={() => toggle('type')}
                        aria-expanded={open === 'type'}
                        aria-haspopup="listbox"
                        className={cn(chipBase, selectedType ? chipActive : chipDefault)}
                    >
                        <BriefcaseIcon className="w-3.5 h-3.5" />
                        {selectedType === 'JOB' ? 'Jobs' : selectedType === 'INTERNSHIP' ? 'Internships' : selectedType === 'WALKIN' ? 'Walk-ins' : 'Type'}
                        <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'type' && 'rotate-180')} />
                    </button>
                    {open === 'type' && (
                        <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-50">
                            {[
                                { label: 'All types', value: null },
                                { label: 'Jobs', value: 'JOB' },
                                { label: 'Internships', value: 'INTERNSHIP' },
                                { label: 'Walk-ins', value: 'WALKIN' },
                            ].map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => { onTypeChange(opt.value); setOpen(null); }}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                        selectedType === opt.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-foreground hover:bg-muted/60'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => toggle('location')}
                    aria-expanded={open === 'location'}
                    aria-haspopup="listbox"
                    className={cn(chipBase, filters.location ? chipActive : chipDefault)}
                >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {filters.location ?? 'Location'}
                    <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'location' && 'rotate-180')} />
                </button>

                {open === 'location' && (
                    <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-52 z-50">
                        {LOCATIONS.map(loc => (
                            <button
                                key={loc}
                                onClick={() => {
                                    setFilters({ ...filters, location: filters.location === loc ? null : loc });
                                    setOpen(null);
                                }}
                                className={cn(
                                    'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                    filters.location === loc
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-foreground hover:bg-muted/60'
                                )}
                            >
                                {loc}
                            </button>
                        ))}
                        {filters.location && (
                            <>
                                <div className="my-1 border-t border-border" />
                                <button
                                    onClick={() => { setFilters({ ...filters, location: null }); setOpen(null); }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium text-muted-foreground hover:bg-muted/60 transition-all"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Salary dropdown */}
            <div className="relative">
                <button
                    onClick={() => toggle('salary')}
                    aria-expanded={open === 'salary'}
                    aria-haspopup="listbox"
                    className={cn(chipBase, filters.salary !== null ? chipActive : chipDefault)}
                >
                    <CurrencyRupeeIcon className="w-3.5 h-3.5" />
                    {filters.salary !== null ? salaryLabel : 'Salary'}
                    <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'salary' && 'rotate-180')} />
                </button>

                {open === 'salary' && (
                    <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-50">
                        {SALARY_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    setFilters({ ...filters, salary: opt.value });
                                    setOpen(null);
                                }}
                                className={cn(
                                    'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                    filters.salary === opt.value
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-foreground hover:bg-muted/60'
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Closing Soon toggle */}
            <button
                onClick={() => setFilters({ ...filters, closingSoon: !filters.closingSoon })}
                aria-pressed={filters.closingSoon}
                className={cn(chipBase, filters.closingSoon ? chipActive : chipDefault)}
            >
                <ClockIcon className="w-3.5 h-3.5" />
                Closing Soon
                {filters.closingSoon && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
            </button>

            {/* Saved toggle */}
            <button
                onClick={() => { if (isLoggedIn) setFilters({ ...filters, saved: !filters.saved }); }}
                aria-pressed={filters.saved}
                disabled={!isLoggedIn}
                title={!isLoggedIn ? 'Sign in to use saved filter' : undefined}
                className={cn(chipBase, filters.saved ? chipActive : chipDefault, !isLoggedIn && 'opacity-40 cursor-not-allowed')}
            >
                <BookmarkIcon className="w-3.5 h-3.5" />
                Saved
            </button>

            {/* Clear all */}
            {hasAnyFilter && (
                <button
                    onClick={() => setFilters({ location: null, salary: null, closingSoon: false, saved: false })}
                    className={cn(chipBase, 'text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10')}
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                    Clear all
                </button>
            )}
        </div>
    );
}
