'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import PublicProfileClient from '@/features/profile/components/public/PublicProfileClient';
import { usePublicPageActivation } from '@/features/profile/hooks/usePublicPageActivation';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { toPublicProfile, toPublicProfileData } from '@/features/profile/mapToPublicProfile';
import { describePageState } from '@/features/profile/profileSummary';
import { MAX_SKILLS } from '@/features/profile/profileConstants';

/**
 * What recruiters see — rendered by the component that renders it for real.
 *
 * It is the actual `PublicProfileClient` in preview mode, so the preview cannot
 * drift from the live page. What used to sit around it was noise: the page URL
 * printed twice, a fake browser chrome bar, and a paragraph explaining the
 * activation window underneath a status chip that already said it.
 */
export function ProfilePreviewCard() {
    const { user, profile } = useAuth();
    const { pagePath, publishedAt, state } = usePublicPageActivation();

    const page = useMemo(() => describePageState(state), [state]);

    // Session profile -> the same flat payload the public API returns -> the
    // exact shape the page component takes. Going through `PublicProfile` is what
    // keeps this preview from drifting from the live page.
    const publicProfileData = useMemo(
        () =>
            toPublicProfileData(
                toPublicProfile(profile, user, {
                    // Only claim "active this week" while the window really is open.
                    lastActivatedAt: page.isLive ? publishedAt : null,
                }),
            ),
        [profile, user, page.isLive, publishedAt],
    );

    const displayUrl = user?.username ? `fresherflow.in/u/${user.username}` : null;
    const skillCount = profile?.skills?.length ?? 0;

    const copyUrl = async () => {
        if (!displayUrl) return;
        try {
            await navigator.clipboard.writeText(`https://${displayUrl}`);
            toast.success('Profile link copied.');
        } catch {
            toast.error('Could not copy the link.');
        }
    };

    return (
        <ProfileSectionCard
            title="Public preview"
            description={
                page.isLive
                    ? 'This is what a recruiter sees right now.'
                    : 'This is what your page will look like once it is live.'
            }
            action={
                <div className="flex items-center gap-2">
                    {displayUrl && (
                        <Button
                            variant="outline"
                            size="chip"
                            onClick={() => void copyUrl()}
                        >
                            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Copy link
                        </Button>
                    )}
                    {page.isLive && pagePath && (
                        <Button variant="outline" size="chip" asChild>
                            <a href={pagePath} target="_blank" rel="noopener noreferrer">
                                Open page
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </a>
                        </Button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* One status line, one URL — separator dot prevents chip/URL collision; min-w-0 + flex-1 lets the URL truncate without shoving the chip. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium',
                            page.isLive ? 'text-success' : 'text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', page.isLive ? 'bg-success' : 'bg-muted-foreground/50')}
                            aria-hidden="true"
                        />
                        {page.label}
                    </span>
                    <span className="hidden h-1 w-1 shrink-0 rounded-full bg-border sm:block" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                        {displayUrl ?? 'Claim a username to get a URL'}
                    </span>
                </div>

                {!page.isLive && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                        <p className="text-xs text-pretty text-muted-foreground">
                            {page.tone === 'offline'
                                ? 'Your page is offline, so this link currently fails for visitors.'
                                : 'Activate it to make the link work. It stays live for 7 days at a time.'}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard">Go to dashboard</Link>
                        </Button>
                    </div>
                )}

                {/* The real public page, framed only by a border. */}
                <div className="max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-border/70 bg-background p-4">
                    <PublicProfileClient data={publicProfileData} />
                </div>

                {skillCount > MAX_SKILLS && (
                    <p className="text-xs text-warning">
                        {skillCount} skills saved, but only the first {MAX_SKILLS} are used for matching.
                    </p>
                )}
            </div>
        </ProfileSectionCard>
    );
}
