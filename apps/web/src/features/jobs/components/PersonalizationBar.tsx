'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { cn } from '@repo/ui/utils/cn';
import { useAuth } from '@/lib/auth/AuthContext';
import { deriveProfileFilterChips, useProfileFilterPrefs } from '@/features/jobs/hooks/useProfileFilters';
import { NewSearchDialog } from '@/features/jobs/tabs/NewSearchDialog';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import EyeSlashIcon from '@heroicons/react/24/outline/EyeSlashIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';

/**
 * The feed's control strip: the master personalization switch, the "N don't
 * match your profile" disclosure that replaces the old silent sink, and the
 * save-this-search nudge.
 *
 * The chips themselves are NOT rendered here — profile filters are written
 * into the URL and come back as ordinary chips through the feed's existing
 * active-chip row, so the query string stays the single source of truth.
 */
const SAVE_NUDGE_KEY = 'ff:saveSearchNudge';

export function PersonalizationBar({
    mismatchCount,
    showHidden,
    onToggleShow,
    filterCount = 0,
    saveCity,
    saveCompany,
    saveBatch,
    className,
}: {
    /** Jobs the profile layer hides or demotes right now. */
    mismatchCount: number;
    showHidden: boolean;
    onToggleShow: () => void;
    /** Manual filters currently applied — drives the save-search nudge. */
    filterCount?: number;
    /** Manual filter values prefilling the save dialog (profile fills the gaps). */
    saveCity?: string | null;
    saveCompany?: string | null;
    saveBatch?: number | null;
    /** Container styling — the parent row already owns padding and gaps. */
    className?: string;
}) {
    const { user, profile } = useAuth();
    const { prefs, setEnabled } = useProfileFilterPrefs();
    const [nudgeDismissed, setNudgeDismissed] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    // Prefs are read synchronously (so the feed is right on first paint), while
    // this row waits for mount — the server can't know the stored switch state.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        try {
            setNudgeDismissed(window.localStorage.getItem(SAVE_NUDGE_KEY) === 'off');
        } catch {
            setNudgeDismissed(false);
        }
    }, []);

    // Dimensions the profile would apply, switched on or off — enough to know
    // the switch must be visible. What is APPLYING shows up as URL chips.
    const allChips = useMemo(() => (user ? deriveProfileFilterChips(profile) : []), [user, profile]);

    const dismissNudge = () => {
        setNudgeDismissed(true);
        try {
            window.localStorage.setItem(SAVE_NUDGE_KEY, 'off');
        } catch {
            // Private mode — the nudge simply returns next session.
        }
    };

    const showNudge = !!user && filterCount >= 2 && !nudgeDismissed;

    if (!mounted || !user || (allChips.length === 0 && mismatchCount === 0 && !showNudge)) return null;

    const initial = {
        city: saveCity || profile?.preferredCities?.[0] || '',
        company: saveCompany || '',
        batch: saveBatch || profile?.pgYear || profile?.gradYear || '',
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            <button
                type="button"
                role="switch"
                aria-checked={prefs.enabled}
                onClick={() => setEnabled(!prefs.enabled)}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-bold transition-colors shrink-0',
                    prefs.enabled
                        ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
            >
                <SparklesIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {prefs.enabled ? 'Profile filters on' : 'Profile filters off'}
            </button>

            {mismatchCount > 0 && (
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    {showHidden ? (
                        <EyeSlashIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                        <EyeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {showHidden
                        ? `Hide the ${mismatchCount} again`
                        : `${mismatchCount} don't match your profile — show them`}
                </button>
            )}

            {showNudge && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium shrink-0">
                    <BookmarkIcon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground">Like this filter set?</span>
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="font-bold text-primary hover:underline"
                    >
                        Save this search
                    </button>
                    <button
                        type="button"
                        onClick={dismissNudge}
                        aria-label="Dismiss save search suggestion"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                </span>
            )}

            <NewSearchDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSaved={() => toast.success('Search saved — alerts are on')}
                onError={() => toast.error('Could not save this search')}
                initial={initial}
            />
        </div>
    );
}
