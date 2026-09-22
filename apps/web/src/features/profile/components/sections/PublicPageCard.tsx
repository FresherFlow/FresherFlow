'use client';

import { ArrowTopRightOnSquareIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { PROFILE_PAGE_ACTIVE_DAYS } from '@fresherflow/utils';
import { usePublicPageActivation } from '@/features/profile/hooks/usePublicPageActivation';

/**
 * The user's own shareable page.
 *
 * Activation pushes the profile payload to the CDN and stamps `profilePublishedAt`,
 * which is what makes fresherflow.in/u/<username> resolve instead of 404 — and only
 * for PROFILE_PAGE_ACTIVE_DAYS, after which the owner has to activate it again.
 */
export function PublicPageCard() {
    const { pagePath, state, isPublishing, activate } = usePublicPageActivation();

    if (!pagePath) return null;

    const { status, daysLeft } = state;
    const isLive = status === 'live' || status === 'expiring';

    const headline =
        status === 'draft' ? 'Not activated yet'
            : status === 'live' ? `Live · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                : status === 'expiring' ? `Goes offline in ${daysLeft === 0 ? 'less than a day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}`
                    : 'Offline — activation lapsed';

    const body =
        status === 'draft'
            ? `Activate to make this link work for anyone you share it with. It stays live for ${PROFILE_PAGE_ACTIVE_DAYS} days.`
            : status === 'live'
                ? `Anyone with this link can open it. Reactivate before it lapses to keep it live.`
                : status === 'expiring'
                    ? 'Activate again now so your link never goes dark.'
                    : `This link is inactive, so it no longer opens. Activate to bring it back for another ${PROFILE_PAGE_ACTIVE_DAYS} days.`;

    const cta = status === 'draft'
        ? (isPublishing ? 'Activating…' : 'Activate my page')
        : (isPublishing ? 'Activating…' : isLive ? 'Extend for 7 days' : 'Reactivate page');

    return (
        <div className="bg-card border border-border/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold text-foreground">Your public page</h3>
                </div>
                <span className={`text-xs font-semibold ${status === 'live' ? 'text-success' : status === 'expiring' ? 'text-warning' : 'text-muted-foreground'}`}>
                    {headline}
                </span>
            </div>

            <p className="text-xs font-mono text-primary truncate">fresherflow.in{pagePath}</p>

            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>

            <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => activate({ navigateToPage: status === 'draft' })} disabled={isPublishing}>
                    {cta}
                </Button>
                {isLive && (
                    <Button size="sm" variant="outline" asChild>
                        <a href={pagePath} target="_blank" rel="noopener noreferrer">
                            View page <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                    </Button>
                )}
            </div>
        </div>
    );
}
