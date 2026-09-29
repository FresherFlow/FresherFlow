'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/ui/cn';
import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    CheckIcon,
    DocumentDuplicateIcon,
    EyeIcon,
    MapPinIcon,
    PencilSquareIcon,
    ShareIcon,
    UserIcon,
} from '@heroicons/react/24/outline';
import { AVAILABILITY_LABEL } from '@/features/profile/publicProfile';
import { usePublicProfileView } from '@/features/profile/hooks/usePublicProfileView';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import ApplyToHireModal from './ApplyToHireModal';

export type CandidateProject = {
    id: string;
    title: string;
    description: string;
    skills: string[];
    githubUrl?: string;
    liveUrl?: string;
};

export type PublicProfileData = {
    user: {
        id?: string;
        fullName: string | null;
        username: string;
        createdAt: string;
    };
    profile: {
        headline: string | null;
        about: string | null;
        skills: string[];
        gradCourse: string | null;
        gradSpecialization: string | null;
        gradYear: number | null;
        collegeId?: string | null;
        collegeName?: string | null;
        collegeState?: string | null;
        educationLevel: string | null;
        pgCourse?: string | null;
        pgSpecialization?: string | null;
        pgYear?: number | null;
        tenthYear?: number | null;
        twelfthYear?: number | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        portfolioUrl: string | null;
        avatarUrl?: string | null;
        resumeUrl?: string | null;
        availability: string | null;
        preferredCities: string[];
        workModes: string[];
        interestedIn?: string[];
        preferredRoles?: string[];
        openToRecruiters: boolean;
        openToRelocate?: boolean;
        completionPercentage?: number | null;
        homeState?: string | null;
        visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' | string | null;
        projects?: CandidateProject[];
    };
};

/** How many skills render before the list collapses behind a "+N more" toggle. */
const SKILL_LIMIT = 12;

const SOLID_BTN =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-xs bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[0.98]';
const GHOST_BTN =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-xs border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-muted/40';
const SOLID_BTN_SM =
    'inline-flex h-7 items-center justify-center gap-1 rounded-xs bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[0.98]';
const GHOST_BTN_SM =
    'inline-flex h-7 items-center justify-center gap-1 rounded-xs border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-muted/40';

/** A stored link may be a bare handle; only ever promote it to https, never downgrade it. */
function externalHref(url: string): string {
    return url.startsWith('http') ? url : `https://${url}`;
}

function GithubSvgIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
        </svg>
    );
}

/**
 * Section rule: a mono label, a hairline to the edge, and an optional trailing count.
 * Every block on this page opens with one, which is what keeps a long page reading as
 * one document instead of a stack of unrelated cards.
 */
function SectionHeading({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="flex items-center gap-3">
            <h2 className="font-record text-micro uppercase tracking-[0.14em] text-muted-foreground">{label}</h2>
            <span className="h-px flex-1 bg-border" aria-hidden />
            {hint && <span className="font-record text-micro tabular-nums text-muted-foreground">{hint}</span>}
        </div>
    );
}

function MetaChip({ icon: Icon, children }: { icon?: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate">{children}</span>
        </span>
    );
}

/**
 * The public page for /u/<handle>.
 *
 * Deliberately minimal. Once a profile link is public, search engines, scrapers and
 * AI crawlers copy it regardless of what robots.txt asks, so everything the world is
 * not owed is simply left out: no resume URL, no CTC expectation, no full about, no
 * education timeline beyond degree and batch, no social profile links, and only the
 * first two projects. Recruiters go further through the intro request, which the
 * candidate can turn off.
 *
 * The owner sees their own page with an edit path and a view count instead.
 */
export default function PublicProfileClient({
    data,
    variant = 'public',
}: {
    data?: PublicProfileData | null;
    /** `preview` is the owner's editor preview: it must not ping the view counter. */
    variant?: 'public' | 'preview';
}) {
    const isPreview = variant === 'preview';
    const { user: authUser, profile: authProfile } = useAuth();
    const [isCopied, setIsCopied] = useState(false);
    const [showAllSkills, setShowAllSkills] = useState(false);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    const user = data?.user || (authUser ? {
        id: authUser.id,
        fullName: authUser.fullName,
        username: authUser.username || 'candidate',
        createdAt: new Date().toISOString(),
    } : null);

    const profile = data?.profile || (authProfile ? {
        headline: authProfile.headline || null,
        about: authProfile.about || null,
        skills: authProfile.skills || [],
        gradCourse: authProfile.gradCourse || null,
        gradSpecialization: authProfile.gradSpecialization || null,
        gradYear: authProfile.gradYear || null,
        collegeId: authProfile.collegeId || null,
        collegeName: authProfile.collegeName || null,
        collegeState: authProfile.collegeState || null,
        educationLevel: authProfile.educationLevel || null,
        githubUrl: authProfile.githubUrl || null,
        linkedinUrl: authProfile.linkedinUrl || null,
        portfolioUrl: authProfile.portfolioUrl || null,
        avatarUrl: authProfile.avatarUrl || null,
        availability: authProfile.availability || null,
        preferredCities: authProfile.preferredCities || [],
        workModes: authProfile.workModes || [],
        openToRecruiters: Boolean(authProfile.openToRecruiters),
        openToRelocate: Boolean((authProfile as unknown as Record<string, unknown>).openToRelocate),
        homeState: (authProfile as unknown as Record<string, unknown>).homeState as string | undefined,
    } : null);

    // Owner-only, and never inflated by the owner opening their own page from the editor.
    const { views } = usePublicProfileView({
        username: user?.username ?? null,
        userId: user?.id ?? '',
        enabled: variant === 'public' && Boolean(user?.id),
    });

    if (!user || !profile) {
        return (
            <div className="flex min-h-[60vh] w-full items-center justify-center bg-background px-6 py-16 text-foreground">
                <div className="w-full max-w-md space-y-4 rounded-xs border border-border bg-card p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xs border border-border bg-muted text-muted-foreground">
                        <UserIcon className="h-6 w-6" />
                    </div>
                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Profile not found</h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        No public fresher profile exists for this username.
                    </p>
                    <Link href="/jobs" className={cn(SOLID_BTN, 'w-full')}>
                        <ArrowLeftIcon className="h-3.5 w-3.5" />
                        Browse fresher jobs
                    </Link>
                </div>
            </div>
        );
    }

    const displayName = user.fullName || user.username;
    const firstName = displayName.split(' ').filter(Boolean)[0] || 'this fresher';

    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'FF';

    // Forced false inside the editor preview. The viewer there *is* the owner, but the card
    // exists to show what a visitor gets — so the owner-only branches (Edit profile, the
    // view-count rail, the CTA suppressed because "you can't intro yourself") are switched off
    // rather than the preview quietly under-reporting what recruiters see.
    const isOwnProfile = !isPreview && Boolean(
        authUser &&
        (authUser.id === user.id || authUser.username?.toLowerCase() === user.username.toLowerCase())
    );

    // The enum is IMMEDIATE / DAYS_15 / MONTH_1; the shared label map is the single
    // source. Anything unmapped is shown readably rather than as a raw enum token.
    const availabilityLabel = profile.availability
        ? (AVAILABILITY_LABEL as Record<string, string | undefined>)[profile.availability]
            ?? profile.availability.replace(/_/g, ' ').toLowerCase()
        : null;
    const availabilityDot = profile.availability === 'IMMEDIATE' ? 'bg-signal-live' : 'bg-signal-aging';

    const locationBase = profile.homeState
        || (profile.preferredCities?.length ? profile.preferredCities.slice(0, 2).join(', ') : null);

    const degreeText = [profile.gradCourse || profile.educationLevel, profile.gradSpecialization]
        .filter(Boolean)
        .join(' · ');

    // Mirrors the API's cap so what the owner previews is what a visitor actually gets.
    const projects = (profile.projects || []).filter((project) => project.title).slice(0, 2);

    const skillsList = (profile.skills || []).filter((skill) => typeof skill === 'string' && skill.trim().length > 0);
    const displayedSkills = showAllSkills ? skillsList : skillsList.slice(0, SKILL_LIMIT);
    const hiddenSkillsCount = skillsList.length - SKILL_LIMIT;

    const hasAbout = Boolean(profile.about && profile.about.trim().length > 0);
    const hasEducation = Boolean(degreeText || profile.collegeName || profile.gradYear);
    const isBlank = !hasAbout && skillsList.length === 0 && projects.length === 0 && !hasEducation;

    const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://fresherflow.in'}/u/${user.username}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            setIsCopied(true);
            toast.success('Profile link copied');
            setTimeout(() => setIsCopied(false), 2500);
        } catch {
            toast.error('Could not copy the link');
        }
    };

    const handleShare = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `${displayName} — Fresher profile`,
                    text: profile.headline || `Check out ${displayName} on FresherFlow`,
                    url: profileUrl,
                });
                return;
            } catch (error) {
                // A cancelled share sheet is not a failure; anything else falls back to copying.
                if ((error as Error).name === 'AbortError') return;
            }
        }
        await handleCopyLink();
    };

    const canRequestIntro = !isOwnProfile && profile.openToRecruiters && Boolean(user.id);
    // With no rail content the two-column grid would leave a dead 300px gutter, so the
    // second column only exists when there is something to put in it.
    //
    const showRail = isOwnProfile || canRequestIntro;

    return (
        <div className={cn('w-full bg-background text-foreground', !isPreview && 'min-h-screen')}>
            <div className={cn('mx-auto w-full', isPreview ? 'max-w-none px-5 py-6' : 'max-w-280 px-6 py-10 md:py-14')}>

                {/* ── Identity header ─────────────────────────────────────────── */}
                <div className="flex items-center gap-3 font-record text-micro uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-1.75 w-1.75 rounded-full bg-warning" aria-hidden />
                    Fresher profile
                    <span className="h-px flex-1 bg-border" aria-hidden />
                    <span className="tabular-nums">{profile.gradYear ? `Batch of ${profile.gradYear}` : 'Live link'}</span>
                </div>

                <header
                    className={cn(
                        'mt-6 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-start lg:justify-between',
                        !isPreview && 'animate-fade-up',
                    )}
                >
                    <div className="flex min-w-0 items-start gap-5">
                        {profile.avatarUrl ? (
                            <Image
                                src={profile.avatarUrl}
                                alt={displayName}
                                width={96}
                                height={96}
                                className="h-16 w-16 shrink-0 rounded-xs border border-border object-cover md:h-20 md:w-20"
                                unoptimized
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xs bg-primary text-xl font-extrabold text-primary-foreground md:h-20 md:w-20 md:text-2xl">
                                {initials}
                            </div>
                        )}

                        <div className="min-w-0 space-y-2">
                            <h1 className="font-display text-[clamp(28px,4.4vw,48px)] font-extrabold leading-[1.04] tracking-[-0.03em] text-foreground">
                                {displayName}
                            </h1>
                            <p className="font-record text-xs text-muted-foreground">
                                @{user.username}
                                {profile.headline ? <span className="text-foreground"> · {profile.headline}</span> : null}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {availabilityLabel && (
                                    <span className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground">
                                        <span className={cn('h-2 w-2 rounded-full', availabilityDot)} aria-hidden />
                                        {availabilityLabel}
                                    </span>
                                )}
                                {locationBase && (
                                    <MetaChip icon={MapPinIcon}>
                                        {locationBase}
                                        {profile.openToRelocate ? ' · open to relocate' : ''}
                                    </MetaChip>
                                )}
                                {profile.openToRecruiters && (
                                    <MetaChip>Open to recruiter intros</MetaChip>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {isOwnProfile && !isPreview && (
                            <Link href="/profile" className={SOLID_BTN}>
                                <PencilSquareIcon className="h-3.5 w-3.5" />
                                Edit profile
                            </Link>
                        )}
                        {canRequestIntro && (
                            <button type="button" onClick={() => setIsApplyModalOpen(true)} className={SOLID_BTN}>
                                Request intro
                            </button>
                        )}
                        <button type="button" onClick={handleShare} className={GHOST_BTN} title="Share this profile">
                            <ShareIcon className="h-3.5 w-3.5" />
                            Share
                        </button>
                        <button type="button" onClick={handleCopyLink} className={GHOST_BTN} title="Copy the profile link">
                            {isCopied
                                ? <CheckIcon className="h-3.5 w-3.5" />
                                : <DocumentDuplicateIcon className="h-3.5 w-3.5" />}
                            {isCopied ? 'Copied' : 'Copy link'}
                        </button>
                    </div>
                </header>

                {/* ── Body ───────────────────────────────────────────────────── */}
                <div className={cn('mt-10 grid grid-cols-1 gap-10', showRail && 'lg:grid-cols-[minmax(0,1fr)_300px]')}>
                    <div className="min-w-0 space-y-10">
                        {hasAbout && (
                            <section className="space-y-4">
                                <SectionHeading label="About" />
                                {/* No line-clamp: the API already trimmed this to a short excerpt, so
                                    clipping it again here would hide text that is public by intent. */}
                                <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                                    {profile.about}
                                </p>
                            </section>
                        )}

                        {skillsList.length > 0 && (
                            <section className="space-y-4">
                                <SectionHeading label="Skills" hint={String(skillsList.length)} />
                                <div className="flex flex-wrap gap-1.5">
                                    {displayedSkills.map((skill) => (
                                        <SkillPill key={skill} skill={skill} />
                                    ))}
                                    {!showAllSkills && hiddenSkillsCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllSkills(true)}
                                            className="inline-flex items-center rounded-xs border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted tabular-nums"
                                        >
                                            +{hiddenSkillsCount} more
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}

                        {projects.length > 0 && (
                            <section className="space-y-4">
                                <SectionHeading label="Selected work" hint={String(projects.length)} />
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {projects.map((project) => (
                                        <article
                                            key={project.id || project.title}
                                            className="flex flex-col justify-between gap-4 rounded-xs border border-border bg-card p-4 transition-colors duration-150 ease-out hover:border-primary/40"
                                        >
                                            <div className="space-y-2">
                                                <h3 className="font-semibold leading-snug text-foreground">{project.title}</h3>
                                                {project.description && (
                                                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-3">
                                                {(project.skills ?? []).length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(project.skills ?? []).map((skill) => (
                                                            <SkillPill key={skill} skill={skill} size="xs" />
                                                        ))}
                                                    </div>
                                                )}
                                                {(project.liveUrl || project.githubUrl) && (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {project.liveUrl && (
                                                            <a
                                                                href={externalHref(project.liveUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={SOLID_BTN_SM}
                                                            >
                                                                Live demo
                                                                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                        {project.githubUrl && (
                                                            <a
                                                                href={externalHref(project.githubUrl)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={GHOST_BTN_SM}
                                                            >
                                                                <GithubSvgIcon className="h-3 w-3" />
                                                                Code
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {hasEducation && (
                            <section className="space-y-4">
                                <SectionHeading label="Education" />
                                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                                    <div className="min-w-0">
                                        {degreeText && <p className="font-semibold text-foreground">{degreeText}</p>}
                                        <p className="text-sm text-muted-foreground">
                                            {profile.collegeName || 'College not listed'}
                                        </p>
                                    </div>
                                    {profile.gradYear && (
                                        <span className="font-record text-xs tabular-nums text-muted-foreground">
                                            Batch of {profile.gradYear}
                                        </span>
                                    )}
                                </div>
                            </section>
                        )}

                        {isBlank && (
                            <p className="text-sm text-muted-foreground">
                                {firstName} is still filling in this profile.
                            </p>
                        )}
                    </div>

                    {/* ── Rail ─────────────────────────────────────────────────── */}
                    {showRail && (
                    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                        {isOwnProfile ? (
                            <div className="space-y-3 rounded-xs border border-border bg-card p-5">
                                <p className="font-record text-micro uppercase tracking-[0.14em] text-muted-foreground">
                                    Your public view
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    This is what someone opening your link sees. Your about is published
                                    as a short excerpt; your resume, CTC expectation and work modes stay
                                    private.
                                </p>
                                {typeof views === 'number' && (
                                    <p className="flex items-center gap-1.5 font-record text-micro uppercase tracking-[0.14em] text-muted-foreground">
                                        <EyeIcon className="h-3.5 w-3.5" aria-hidden />
                                        <span className="tabular-nums">{views.toLocaleString()}</span>
                                        profile views
                                    </p>
                                )}
                                <Link href="/profile" className={cn(SOLID_BTN, 'w-full')}>
                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                    Edit profile
                                </Link>
                            </div>
                        ) : canRequestIntro ? (
                            <div className="space-y-3 rounded-xs border border-border bg-card p-5">
                                <p className="font-record text-micro uppercase tracking-[0.14em] text-muted-foreground">
                                    Hiring?
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Send {firstName} a short intro. Your name and contact go straight to them —
                                    no account needed.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsApplyModalOpen(true)}
                                    className={cn(SOLID_BTN, 'w-full')}
                                >
                                    Request intro
                                </button>
                            </div>
                        ) : null}
                    </aside>
                    )}
                </div>

                <div className={cn('border-t border-border pt-6', isPreview ? 'mt-8' : 'mt-14')}>
                    <p className="text-xs text-muted-foreground">
                        Fresher profile on FresherFlow ·{' '}
                        <Link href="/jobs" className="font-semibold text-foreground transition-colors hover:text-primary">
                            Browse verified fresher jobs
                        </Link>
                    </p>
                </div>
            </div>

            {user.id && (
                <ApplyToHireModal
                    username={user.username}
                    candidateId={user.id}
                    candidateName={displayName}
                    isOpen={isApplyModalOpen}
                    onClose={() => setIsApplyModalOpen(false)}
                />
            )}
        </div>
    );
}
