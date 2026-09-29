'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/client';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import PublicProfileClient from '@/features/profile/components/public/PublicProfileClient';
import { usePublicPageActivation } from '@/features/profile/hooks/usePublicPageActivation';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { toPublicProfile, toPublicProfileData } from '@/features/profile/mapToPublicProfile';
import { describePageState, pageActionBusyLabel, pageActionLabel } from '@/features/profile/profileSummary';
import { MAX_SKILLS } from '@/features/profile/profileConstants';

/**
 * The public page, in the editor, as one surface.
 *
 * This used to be three nested frames: a card, a rounded band inside it, and a third bordered
 * box with `max-h-96 overflow-y-auto` around the real page — so a preview of a full-bleed page
 * was a small scroll jail inside two other boxes, and the page inside it drew yet another
 * border of its own.
 *
 * Now the card is the only frame. Everything sits inside it as hairline-separated bands
 * (status → the one setting → the page itself), and the page renders flush to the card edges
 * exactly as it renders on fresherflow.in. Nothing scrolls internally and nothing is framed
 * twice.
 *
 * The recruiter switch lives here rather than on a settings tab because it only means anything
 * next to the page it changes. There is no counterpart for "who can see this": publishing is
 * one-way in practice, so the product does not offer a switch that could not undo it.
 */
export function ProfilePreviewCard() {
    const { user, profile, updateProfileState, refreshProfile } = useAuth();
    const { pagePath, publishedAt, state, isPublishing, activate } = usePublicPageActivation();
    const [savingRecruiters, setSavingRecruiters] = useState(false);

    const page = useMemo(() => describePageState(state), [state]);

    // Session profile -> the same flat payload the public API returns -> the exact shape the
    // page component takes. Going through `PublicProfile` is what keeps this preview from
    // drifting from the live page.
    const publicProfileData = useMemo(
        () =>
            toPublicProfileData(
                toPublicProfile(profile, user, {
                    // Only claim "active this week" while the boost really is running.
                    lastActivatedAt: page.isBoosted ? publishedAt : null,
                }),
            ),
        [profile, user, page.isBoosted, publishedAt],
    );

    const openToRecruiters = Boolean(profile?.openToRecruiters);
    const skillCount = profile?.skills?.length ?? 0;

    const setRecruiters = async (next: boolean) => {
        if (savingRecruiters || next === openToRecruiters) return;
        setSavingRecruiters(true);
        try {
            await profileApi.updateProfile({ openToRecruiters: next });
            updateProfileState({ openToRecruiters: next });
            await refreshProfile().catch(() => undefined);
            toast.success(next ? 'Recruiters can now send you intros.' : 'Recruiter intros are off.');
        } catch {
            // The switch only flips after the write lands, so a failure never looks saved.
            toast.error('Could not save that setting. Try again.');
        } finally {
            setSavingRecruiters(false);
        }
    };

    return (
        <ProfileSectionCard
            title="Public page"
            description={
                page.isLive
                    ? 'Exactly what someone opening your link sees.'
                    : 'Not published yet — this is the draft.'
            }
            className="overflow-hidden"
            bodyClassName="p-0"
            action={
                page.isLive && pagePath ? (
                    <Button variant="outline" size="chip" asChild>
                        <a href={pagePath} target="_blank" rel="noopener noreferrer">
                            Open page
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </a>
                    </Button>
                ) : undefined
            }
        >
            {/* Band 1 — status, URL, and the one action. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 px-5 py-3 sm:px-6">
                <span
                    className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold',
                        page.tone === 'live'
                            ? 'text-success'
                            : page.tone === 'lapsing'
                                ? 'text-warning'
                                : 'text-muted-foreground',
                    )}
                >
                    <span
                        className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            page.tone === 'live'
                                ? 'bg-success'
                                : page.tone === 'lapsing'
                                    ? 'bg-warning'
                                    : 'bg-muted-foreground/50',
                        )}
                        aria-hidden="true"
                    />
                    {page.label}
                </span>

                <span className="hidden h-1 w-1 shrink-0 rounded-full bg-border sm:block" aria-hidden="true" />

                <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                    {user?.username ? `fresherflow.in/u/${user.username}` : 'Claim a username to get a URL'}
                </code>

                {page.action !== 'none' && (
                    <Button size="chip" onClick={() => void activate()} disabled={isPublishing}>
                        {isPublishing ? pageActionBusyLabel(page.action) : pageActionLabel(page.action)}
                    </Button>
                )}
            </div>

            {/* Band 2 — the only setting, plus the consequence of activating. */}
            <div className="space-y-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Allow recruiter intros</p>
                        <p className="text-xs text-muted-foreground">
                            Adds a “Request intro” button so recruiters can reach you directly.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={openToRecruiters}
                        disabled={savingRecruiters}
                        onClick={() => void setRecruiters(!openToRecruiters)}
                        className={cn(
                            'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed',
                            openToRecruiters
                                ? 'border-success/30 bg-success/10 text-success'
                                : 'border-border bg-card text-muted-foreground hover:text-foreground',
                            savingRecruiters && 'opacity-60',
                        )}
                    >
                        <span
                            className={cn(
                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                openToRecruiters ? 'bg-success' : 'bg-muted-foreground/50',
                            )}
                            aria-hidden="true"
                        />
                        {savingRecruiters ? 'Saving…' : openToRecruiters ? 'On' : 'Off'}
                    </button>
                </div>

                {page.action === 'activate' && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Publishing shares this page with anyone who has the link, search engines included,
                        and it stays online after that — the link never stops working. That is hard to take
                        back: once it is indexed, copies can stay out there.
                    </p>
                )}

                {page.tone === 'unboosted' && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Your page is still online and the link still works — you have just dropped out of
                        the recruiter directory. Re-boost to go back to the top of it.
                    </p>
                )}
            </div>

            {/* Band 3 — the page itself, flush. No second frame, no inner scrollbar. */}
            <div className="bg-background">
                <PublicProfileClient data={publicProfileData} variant="preview" />
            </div>

            {skillCount > MAX_SKILLS && (
                <p className="border-t border-border/60 px-5 py-3 text-xs text-warning sm:px-6">
                    {skillCount} skills saved, but only the first {MAX_SKILLS} are used for matching.
                </p>
            )}
        </ProfileSectionCard>
    );
}
