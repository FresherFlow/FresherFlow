'use client';

import { useEffect, useState } from 'react';
import { cn } from '@fresherflow/ui/utils/cn';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProfileFilterPrefs } from '@/features/jobs/hooks/useProfileFilters';

/**
 * The profile layer, as one switch.
 *
 * This strip used to be three competing controls — a switch reading
 * "Profile filters on · 9/9 applied", a dashed pill reading "33 don't match
 * your profile — show them", and a save-search nudge with its own dismiss
 * state — sitting next to the user's actual filters. All of it competed with
 * the thing the page is for: the jobs.
 *
 * What is left is the only decision the user has here: should the feed follow
 * their profile? One switch, one plain label. The hidden count is a quiet text
 * link that only exists when something is actually hidden, and saving a search
 * lives in Alerts where a user goes on purpose.
 *
 * Profile dims still arrive as ordinary URL chips (`useCategoryPageState`),
 * so the query string stays the single source of truth.
 */
export function PersonalizationBar({
    mismatchCount,
    showHidden,
    onToggleShow,
    className,
}: {
    /** Jobs the profile layer hides or demotes right now. */
    mismatchCount: number;
    showHidden: boolean;
    onToggleShow: () => void;
    /** Container styling — the parent row already owns padding and gaps. */
    className?: string;
}) {
    const { user } = useAuth();
    const { prefs, setEnabled } = useProfileFilterPrefs();
    // Prefs are read synchronously so the feed is right on first paint, but
    // this row waits for mount — the server cannot know the stored switch.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !user) return null;

    return (
        <div className={cn('inline-flex items-center gap-2 shrink-0', className)}>
            <button
                type="button"
                role="switch"
                aria-checked={prefs.enabled}
                onClick={() => setEnabled(!prefs.enabled)}
                className="group inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-xs font-semibold text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        'relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ease-out',
                        prefs.enabled
                            ? 'border-transparent bg-primary'
                            : 'border-border bg-muted',
                    )}
                >
                    <span
                        className={cn(
                            'absolute left-0.5 size-4 rounded-full shadow-sm transition-transform duration-150 ease-out',
                            prefs.enabled
                                ? 'translate-x-4 bg-primary-foreground'
                                : 'translate-x-0 bg-muted-foreground/70',
                        )}
                    />
                </span>
                Match my profile
            </button>

            {prefs.enabled && mismatchCount > 0 && (
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                >
                    {showHidden ? `Hide ${mismatchCount} hidden` : `Show ${mismatchCount} hidden`}
                </button>
            )}
        </div>
    );
}
