'use client';

import { MapPinIcon, ClockIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';

import { INDIAN_CITIES } from '@fresherflow/constants';

const LOCATIONS = [...INDIAN_CITIES.slice(0, 5), 'Remote'];

interface OpportunityFiltersProps {
    id?: string;
    selectedLoc: string | null;
    setSelectedLoc: (loc: string | null) => void;
    closingSoon: boolean;
    setClosingSoon: (val: boolean) => void;
    showOnlySaved: boolean;
    setShowOnlySaved: (val: boolean) => void;
    minSalary: number | null;
    setMinSalary: (val: number | null) => void;
    className?: string;
}

const SALARY_RANGES = [
    { label: 'Any', value: null },
    { label: '3L+', value: 300000 },
    { label: '6L+', value: 600000 },
    { label: '10L+', value: 1000000 },
    { label: '15L+', value: 1500000 },
];

export function OpportunityFilters({
    id,
    selectedLoc,
    setSelectedLoc,
    closingSoon,
    setClosingSoon,
    showOnlySaved,
    setShowOnlySaved,
    minSalary,
    setMinSalary,
    className
}: OpportunityFiltersProps) {
    return (
        <aside id={id} className={cn("space-y-6", className)}>
            <div className="bg-card/80 rounded-2xl border border-border p-4 md:p-5 space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-bold text-muted-foreground capitalize tracking-[0.2em]">Location</h3>
                        {selectedLoc && (
                            <button
                                onClick={() => setSelectedLoc(null)}
                                className="text-[10px] font-bold text-primary capitalize tracking-widest hover:underline"
                                aria-label="Clear location filter"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        {LOCATIONS.map(loc => (
                            <button
                                key={loc}
                                onClick={() => setSelectedLoc(selectedLoc === loc ? null : loc)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl border text-xs font-semibold transition-all capitalize tracking-wide focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                                    selectedLoc === loc
                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                aria-pressed={selectedLoc === loc}
                            >
                                <MapPinIcon className="w-4 h-4 opacity-70" aria-hidden="true" />
                                {loc}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground capitalize tracking-[0.2em] mb-4">Min. Salary</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {SALARY_RANGES.map((range) => (
                            <button
                                key={range.label}
                                onClick={() => setMinSalary(range.value)}
                                className={cn(
                                    "px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all capitalize tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                                    minSalary === range.value
                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground capitalize tracking-[0.2em] mb-4">Urgency</h3>
                    <button
                        onClick={() => setClosingSoon(!closingSoon)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all text-left capitalize tracking-wide focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                            closingSoon
                                ? "bg-orange-100 border-orange-300 text-slate-900 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-300 shadow-sm"
                                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-pressed={closingSoon}
                    >
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" aria-hidden="true" />
                            <span>Closing Soon</span>
                        </div>
                        {closingSoon && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                    </button>
                </div>

                <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground capitalize tracking-[0.2em] mb-4">Saved</h3>
                    <button
                        onClick={() => setShowOnlySaved(!showOnlySaved)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-3 rounded-xl border text-xs font-semibold transition-all text-left capitalize tracking-wide focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                            showOnlySaved
                                ? "bg-primary/10 border-primary text-primary shadow-sm"
                                : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        aria-pressed={showOnlySaved}
                    >
                        <div className="flex items-center gap-2">
                            <BookmarkIcon className="w-4 h-4" aria-hidden="true" />
                            <span>Saved only</span>
                        </div>
                        {showOnlySaved && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
