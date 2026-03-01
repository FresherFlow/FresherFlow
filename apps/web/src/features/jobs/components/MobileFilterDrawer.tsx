'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

import { useState, useEffect } from 'react';

const LOCATIONS = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Remote'];

interface MobileFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    draftLoc: string | null;
    setDraftLoc: (loc: string | null) => void;
    draftClosingSoon: boolean;
    setDraftClosingSoon: (val: boolean) => void;
    draftShowOnlySaved: boolean;
    setDraftShowOnlySaved: (val: boolean) => void;
    draftMinSalary: number | null;
    setDraftMinSalary: (val: number | null) => void;
    onApply: () => void;
    onClear: () => void;
}

const SALARY_RANGES = [
    { label: 'Any', value: null },
    { label: '3L+', value: 300000 },
    { label: '6L+', value: 600000 },
    { label: '10L+', value: 1000000 },
    { label: '15L+', value: 1500000 },
];

export function MobileFilterDrawer({
    isOpen,
    onClose,
    draftLoc,
    setDraftLoc,
    draftClosingSoon,
    setDraftClosingSoon,
    draftShowOnlySaved,
    setDraftShowOnlySaved,
    draftMinSalary,
    setDraftMinSalary,
    onApply,
    onClear
}: MobileFilterDrawerProps) {
    const [touchStart, setTouchStart] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientY;
        const distance = touchEnd - touchStart;
        if (distance > 100) { // Swipe down threshold
            onClose();
        }
        setTouchStart(null);
    };

    // Basic focus management
    useEffect(() => {
        if (isOpen) {
            // Give the browser a moment to render then focus close button for accessibility
            const timer = setTimeout(() => {
                const btn = document.getElementById('close-filters-btn');
                btn?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
            <div
                className="absolute inset-0 bg-background/40 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />
            <div
                className="absolute inset-x-3 bottom-4 top-auto max-h-[85vh] overflow-auto rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-10 duration-300"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Visual affordance for swipe */}
                <div className="flex justify-center mb-4">
                    <div className="w-12 h-1.5 rounded-full bg-muted shadow-inner" />
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-0.5">
                        <h3 className="text-lg font-bold tracking-tight text-foreground">Filters</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tailor your feed</p>
                    </div>
                    <button
                        id="close-filters-btn"
                        onClick={onClose}
                        className="h-10 w-10 rounded-xl border border-border bg-background/50 flex items-center justify-center text-muted-foreground hover:bg-muted focus:ring-2 focus:ring-primary outline-none transition-all"
                        aria-label="Close filters"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Location</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {LOCATIONS.map((loc) => (
                                <button
                                    key={`mobile-${loc}`}
                                    onClick={() => setDraftLoc(draftLoc === loc ? null : loc)}
                                    className={cn(
                                        "px-3 py-3 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                        draftLoc === loc
                                            ? "bg-primary/20 border-primary text-primary shadow-sm scale-[0.98]"
                                            : "bg-background border-border text-muted-foreground active:bg-muted"
                                    )}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Min. Salary</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {SALARY_RANGES.map((range) => (
                                <button
                                    key={`mobile-sal-${range.label}`}
                                    onClick={() => setDraftMinSalary(range.value)}
                                    className={cn(
                                        "px-3 py-3 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                        draftMinSalary === range.value
                                            ? "bg-primary/20 border-primary text-primary shadow-sm scale-[0.98]"
                                            : "bg-background border-border text-muted-foreground active:bg-muted"
                                    )}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Urgency</h4>
                        <button
                            onClick={() => setDraftClosingSoon(!draftClosingSoon)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-3.5 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                draftClosingSoon
                                    ? "bg-orange-100 border-orange-300 text-slate-900 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-300"
                                    : "bg-background border-border text-muted-foreground active:bg-muted"
                            )}
                        >
                            <span>Closing soon</span>
                            {draftClosingSoon && <div className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-amber-500" />}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Saved</h4>
                        <button
                            onClick={() => setDraftShowOnlySaved(!draftShowOnlySaved)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-3.5 rounded-xl border text-xs font-semibold transition-all uppercase tracking-wide",
                                draftShowOnlySaved
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-background border-border text-muted-foreground active:bg-muted"
                            )}
                        >
                            <span>Saved only</span>
                            {draftShowOnlySaved && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-card pt-4 mt-6 border-t border-border flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 text-xs font-bold uppercase tracking-widest rounded-xl"
                        onClick={onClear}
                    >
                        Clear
                    </Button>
                    <Button
                        className="flex-1 h-12 text-xs font-bold uppercase tracking-widest rounded-xl"
                        onClick={onApply}
                    >
                        Apply filters
                    </Button>
                </div>
            </div>
        </div>
    );
}
