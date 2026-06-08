'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';

const CORP_LOCATIONS = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Remote'];
const GOVT_LOCATIONS = ['All India', 'Delhi', 'Telangana', 'Maharashtra', 'Uttar Pradesh', 'Karnataka'];

export interface FilterBarFilters {
    location: string | null;
    year: number | null;
    closingSoon: boolean;
    saved: boolean;
    sector: string | null;
    qualification: string | null;
    course: string | null;
}

const GOVT_SECTORS = ['Defense', 'Railways', 'Banking', 'Teaching', 'Police', 'SSC / UPSC', 'PSU'];
const GOVT_QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Postgraduate'];
const CORP_COURSES = ['B.Tech/B.E.', 'M.C.A.', 'MBA', 'B.Sc/B.Com/B.A', 'Diploma'];

interface FilterDropdownBarProps {
    filters: FilterBarFilters;
    setFilters: (f: FilterBarFilters) => void;
    isLoggedIn: boolean;
    // Optional: type selector (only on /opportunities page)
    selectedType?: string | null;
    onTypeChange?: (type: string | null) => void;
    pageType?: string; // e.g. 'GOVERNMENT'
}

type OpenPanel = 'location' | 'year' | 'type' | 'sector' | 'qualification' | 'course' | null;

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2020;
const END_YEAR = CURRENT_YEAR + 2;
const PASSOUT_YEAR_OPTIONS = Array.from(
    { length: Math.max(0, END_YEAR - START_YEAR + 1) },
    (_, idx) => START_YEAR + idx
);

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

export function FilterDropdownBar({ filters, setFilters, isLoggedIn, selectedType, onTypeChange, pageType }: FilterDropdownBarProps) {
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

    const hasAnyFilter = !!(filters.location || filters.year || filters.closingSoon || filters.saved || filters.sector || filters.qualification || filters.course);
    const isGovt = pageType === 'GOVERNMENT';

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
                        {(isGovt ? GOVT_LOCATIONS : CORP_LOCATIONS).map(loc => (
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

            {/* Govt specific dropdowns */}
            {isGovt && (
                <>
                    <div className="relative">
                        <button
                            onClick={() => toggle('sector')}
                            aria-expanded={open === 'sector'}
                            className={cn(chipBase, filters.sector ? chipActive : chipDefault)}
                        >
                            <BriefcaseIcon className="w-3.5 h-3.5" />
                            {filters.sector ?? 'Sector'}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'sector' && 'rotate-180')} />
                        </button>
                        {open === 'sector' && (
                            <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-50">
                                {GOVT_SECTORS.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, sector: filters.sector === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.sector === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => toggle('qualification')}
                            aria-expanded={open === 'qualification'}
                            className={cn(chipBase, filters.qualification ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            {filters.qualification ?? 'Qualification'}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'qualification' && 'rotate-180')} />
                        </button>
                        {open === 'qualification' && (
                            <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-50">
                                {GOVT_QUALIFICATIONS.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, qualification: filters.qualification === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.qualification === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Corporate specific dropdowns */}
            {!isGovt && (
                <>
                    <div className="relative">
                        <button
                            onClick={() => toggle('course')}
                            aria-expanded={open === 'course'}
                            className={cn(chipBase, filters.course ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            {filters.course ?? 'Course'}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'course' && 'rotate-180')} />
                        </button>
                        {open === 'course' && (
                            <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-50">
                                {CORP_COURSES.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, course: filters.course === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.course === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Passout year dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => toggle('year')}
                            aria-expanded={open === 'year'}
                            aria-haspopup="listbox"
                            className={cn(chipBase, filters.year !== null ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            {filters.year ?? 'Year'}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'year' && 'rotate-180')} />
                        </button>

                        {open === 'year' && (
                            <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-36 z-50">
                                <button
                                    onClick={() => {
                                        setFilters({ ...filters, year: null });
                                        setOpen(null);
                                    }}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                        filters.year === null
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-foreground hover:bg-muted/60'
                                    )}
                                >
                                    Any
                                </button>
                                {PASSOUT_YEAR_OPTIONS.map((year) => (
                                    <button
                                        key={year}
                                        onClick={() => {
                                            setFilters({ ...filters, year });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.year === year
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Clear all */}
            {hasAnyFilter && (
                <button
                    onClick={() => setFilters({ location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null })}
                    className={cn(chipBase, 'text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10')}
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                    Clear all
                </button>
            )}
        </div>
    );
}






