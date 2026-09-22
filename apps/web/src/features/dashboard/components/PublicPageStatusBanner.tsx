'use client';

import Link from 'next/link';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { calculateProfileCompletion, PROFILE_PAGE_ACTIVE_DAYS } from '@fresherflow/utils';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePublicPageActivation } from '@/features/profile/hooks/usePublicPageActivation';

/**
 * Dashboard nudge for the public page lifecycle.
 *
 * The page is only live for PROFILE_PAGE_ACTIVE_DAYS after each activation, so this is
 * where the user is reminded to finish the profile (which is what gets published) and to
 * reactivate before the link goes dark. Renders nothing while the page is comfortably live.
 */
export function PublicPageStatusBanner() {
    const { profile, isLoading } = useAuth();
    const { pagePath, state, isPublishing, activate } = usePublicPageActivation();

    if (isLoading || !pagePath) return null;

    const completion = calculateProfileCompletion(profile).percentage;
    const { status, daysLeft } = state;

    if (status === 'live' && completion >= 100) return null;

    const isIncomplete = completion < 100;

    const message = isIncomplete
        ? `Your page is ${completion}% ready. Finish your profile to make ${pagePath} worth sharing.`
        : status === 'draft'
            ? `Your profile is ready. Activate ${pagePath} so the link works.`
            : status === 'expiring'
                ? `${pagePath} goes offline in ${daysLeft === 0 ? 'less than a day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}.`
                : `${pagePath} is offline — the ${PROFILE_PAGE_ACTIVE_DAYS}-day activation lapsed.`;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-start gap-3 flex-1">
                <GlobeAltIcon className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Your public page</p>
                    <p className="text-xs text-muted-foreground">{message}</p>
                </div>
            </div>
            <div className="shrink-0">
                {isIncomplete ? (
                    <Button size="sm" asChild>
                        <Link href="/profile/complete">Finish profile</Link>
                    </Button>
                ) : (
                    <Button size="sm" onClick={() => activate({ navigateToPage: status === 'draft' })} disabled={isPublishing}>
                        {isPublishing ? 'Activating…' : status === 'draft' ? 'Activate page' : 'Reactivate'}
                    </Button>
                )}
            </div>
        </div>
    );
}
