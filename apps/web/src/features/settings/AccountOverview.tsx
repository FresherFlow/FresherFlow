'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { describePageState, pageActionBusyLabel, pageActionLabel } from '@/features/profile/profileSummary';
import { getProfileGaps } from '@/features/profile/profileChecklist';
import { usePublicPageActivation } from '@/features/profile/hooks/usePublicPageActivation';
import {
    UserIcon,
    Cog6ToothIcon,
    PaintBrushIcon,
    UserPlusIcon,
    ChatBubbleLeftRightIcon,
    ChevronRightIcon,
    GlobeAltIcon,
    ClipboardDocumentIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const SECTIONS = [
    {
        key: 'profile',
        title: 'Profile',
        description: 'Candidate details, skills, education and links.',
        href: '/account?tab=profile',
        Icon: UserIcon,
    },
    {
        key: 'settings',
        title: 'Account Settings',
        description: 'Credentials, active sessions and danger zone.',
        href: '/account?tab=settings',
        Icon: Cog6ToothIcon,
    },
    {
        key: 'appearance',
        title: 'Appearance',
        description: 'Sidebar style: inset, floating or standard.',
        href: '/account?tab=appearance',
        Icon: PaintBrushIcon,
    },
    {
        key: 'referral',
        title: 'Referrals',
        description: 'Invite friends and track referral rewards.',
        href: '/account?tab=referral',
        Icon: UserPlusIcon,
    },
    {
        key: 'feedback',
        title: 'Feedback',
        description: 'Report issues and suggest improvements.',
        href: '/account?tab=feedback',
        Icon: ChatBubbleLeftRightIcon,
    },
] as const;

function AccountOverviewContent() {
    const { user } = useAuth();

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
            {/* Header */}
            <div className="border-b border-border/40 pb-4">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    Account
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Signed in as {user?.email || `@${user?.username || 'candidate'}`}
                </p>
            </div>

            {/* Section links */}
            <section className="bg-card border border-border/70 rounded-2xl shadow-xs overflow-hidden">
                {SECTIONS.map(({ key, title, description, href, Icon }, index) => (
                    <Fragment key={key}>
                        <Link
                            href={href}
                            className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/50 ${
                                index > 0 ? 'border-t border-border/40' : ''
                            }`}
                        >
                            <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/50 shrink-0">
                                <Icon className="size-4 text-muted-foreground" />
                            </span>
                            <span className="flex-1 min-w-0">
                                <span className="text-sm font-bold text-foreground block">{title}</span>
                                <span className="text-xs text-muted-foreground block truncate">
                                    {description}
                                </span>
                            </span>
                            <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
                        </Link>
                        {index === 0 && <YourPublicPageRow />}
                    </Fragment>
                ))}
            </section>
        </div>
    );
}

/**
 * "Your public page" hub row: the one place in /account that names
 * fresherflow.in/u/<username>, shows the boost status chip (the same
 * usePublicPageActivation rule as the editor preview), and links out to view,
 * copy, and the next checklist gap. Reads only the cached useAuth profile — no
 * new fetch.
 *
 * The row offers exactly two things: open the page while it resolves, and publish or
 * re-boost when there is something to renew. Publishing is permanent, so the URL survives
 * a lapsed boost — the only thing re-boosting buys is recruiter-directory placement.
 * There is deliberately no "hide my page" control here — see profileSummary.ts for why
 * that switch was removed rather than fixed.
 */
function YourPublicPageRow() {
    const { profile } = useAuth();
    // Single source for pagePath + status; activate() calls the one publish endpoint
    // (which also re-boosts) with no navigation, so the owner stays on /account and
    // the chip flips via refreshProfile.
    const { username, pagePath, state, isPublishing, activate } = usePublicPageActivation();

    const displayUrl = username ? `fresherflow.in/u/${username}` : null;
    const page = describePageState(state);
    const nextGap = getProfileGaps(profile)[0] ?? null;

    // Copy-link toast pattern mirrors ProfilePreviewCard — never alert().
    const copyUrl = async () => {
        if (!displayUrl) return;
        try {
            await navigator.clipboard.writeText(`https://${displayUrl}`);
            toast.success('Profile link copied.');
        } catch {
            toast.error('Could not copy the link.');
        }
    };

    const chipClass =
        page.tone === 'live'
            ? 'bg-success/10 text-success border-success/20'
            : page.tone === 'lapsing'
              ? 'bg-warning/10 text-warning border-warning/20'
              : 'bg-muted text-muted-foreground border-border/60';

    return (
        <div className="border-t border-border/40 px-5 py-4">
            <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-muted/50 shrink-0">
                    <GlobeAltIcon className="size-4 text-muted-foreground" />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground block">Your public page</span>
                    <span className="text-xs text-muted-foreground block truncate font-mono">
                        {displayUrl ?? 'Claim a username to get your page URL'}
                    </span>
                </span>
                <span
                    className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-xs font-bold border ${chipClass}`}
                >
                    {page.label}
                </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                {pagePath ? (
                    <>
                        <button
                            type="button"
                            onClick={() => void copyUrl()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                        >
                            <ClipboardDocumentIcon className="size-3.5" aria-hidden="true" />
                            Copy link
                        </button>
                        {/* Rendered only while the link really resolves, so it can never point
                            at a 404. Independent of the action below: an unboosted page is still
                            live, and its owner should be able to open it. */}
                        {page.isLive && (
                            <a
                                href={pagePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                            >
                                View page
                                <ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden="true" />
                            </a>
                        )}
                        {page.action !== 'none' && (
                            <button
                                type="button"
                                onClick={() => void activate()}
                                disabled={isPublishing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isPublishing ? pageActionBusyLabel(page.action) : pageActionLabel(page.action)}
                            </button>
                        )}
                    </>
                ) : (
                    <Link
                        href="/choose-username"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Claim username
                    </Link>
                )}
                {nextGap ? (
                    <Link
                        href={`/account?tab=profile&section=${nextGap.section}`}
                        className="text-xs font-semibold text-primary hover:underline"
                    >
                        Complete: {nextGap.label} →
                    </Link>
                ) : (
                    pagePath && (
                        <span className="text-xs text-success font-medium">Everything is filled in</span>
                    )
                )}
            </div>
        </div>
    );
}

export default function AccountOverview() {
    return (
        <UsernameGate>
            <AccountOverviewContent />
        </UsernameGate>
    );
}
