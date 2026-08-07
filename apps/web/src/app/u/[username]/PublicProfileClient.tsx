'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth/AuthContext';
import { LogoImage } from '@/lib/navigation/LogoImage';
import { cn } from '@/ui/cn';
import {
    AcademicCapIcon,
    MapPinIcon,
    ClockIcon,
    GlobeAltIcon,
    ArrowTopRightOnSquareIcon,
    UserIcon,
    ArrowLeftIcon,
    ShareIcon,
    DocumentDuplicateIcon,
    PencilSquareIcon,
    CheckIcon,
    BuildingOffice2Icon,
    UserGroupIcon,
    BookmarkSquareIcon,
    FolderIcon,
    LinkIcon,
    AdjustmentsHorizontalIcon,
    CalendarIcon,
    WrenchScrewdriverIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { SkillPill } from '@/ui/SkillPill';

export type CandidateProject = {
    id: string;
    title: string;
    description: string;
    skills: string[];
    githubUrl?: string;
    liveUrl?: string;
};

export type GithubRepo = {
    id: number | string;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count?: number;
    updated_at?: string | null;
    homepage?: string | null;
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
        githubPinnedRepos?: GithubRepo[];
    };
};

function formatAvailability(availability: string | null): string {
    if (!availability) return 'Open to Work';
    const upper = availability.toUpperCase();
    if (upper === 'IMMEDIATE' || upper === 'FULL_TIME') return 'Open to Work';
    if (upper === 'OPEN' || upper === 'OPEN_TO_OPPORTUNITIES') return 'Open to Work';
    if (upper === 'FIFTEEN_DAYS' || upper === '15_DAYS') return 'Available in 15 Days';
    if (upper === 'THIRTY_DAYS' || upper === '30_DAYS') return 'Available in 30 Days';
    return availability.replace(/_/g, ' ');
}

function formatOpportunityType(type: string): string {
    const upper = type.toUpperCase();
    if (upper === 'JOB') return 'Full-time Jobs';
    if (upper === 'INTERNSHIP') return 'Internships';
    if (upper === 'WALK_IN') return 'Walk-in Drives';
    if (upper === 'GOVT_JOB') return 'Government Jobs';
    return type.replace(/_/g, ' ');
}

function formatWorkMode(mode: string): string {
    const upper = mode.toUpperCase();
    if (upper === 'ONSITE') return 'Onsite (Office)';
    if (upper === 'REMOTE') return 'Remote';
    if (upper === 'HYBRID') return 'Hybrid';
    return mode.replace(/_/g, ' ');
}

function extractGithubUsername(githubUrl: string | null | undefined): string | null {
    if (!githubUrl) return null;
    const trimmed = githubUrl.trim();
    if (!trimmed) return null;
    const cleanUrl = trimmed.replace(/\/+$/, '');
    const match = cleanUrl.match(/(?:github\.com\/|^@?)([a-zA-Z0-9-]+)$/i);
    if (match && match[1]) {
        const name = match[1];
        if (name.toLowerCase() !== 'github.com') return name;
    }
    const parts = cleanUrl.split('/');
    const last = parts[parts.length - 1]?.replace(/^@/, '');
    return last || null;
}

function formatRepoUpdated(updatedAt?: string | null): string | null {
    if (!updatedAt) return null;
    try {
        const date = new Date(updatedAt);
        if (isNaN(date.getTime())) return null;
        return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch {
        return null;
    }
}

function GithubSvgIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
    );
}

function LinkedinSvgIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
    );
}

export default function PublicProfileClient({ data }: { data?: PublicProfileData | null }) {
    const { user: authUser, profile: authProfile } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [showAllSkills, setShowAllSkills] = useState(false);
    const [showFullAbout, setShowFullAbout] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        resumeUrl: (authProfile as unknown as Record<string, unknown>).resumeUrl as string | undefined,
        availability: authProfile.availability || null,
        preferredCities: authProfile.preferredCities || [],
        workModes: authProfile.workModes || [],
        interestedIn: (authProfile as unknown as Record<string, unknown>).interestedIn as string[] | undefined,
        preferredRoles: (authProfile as unknown as Record<string, unknown>).preferredRoles as string[] | undefined,
        openToRecruiters: Boolean(authProfile.openToRecruiters),
        openToRelocate: Boolean((authProfile as unknown as Record<string, unknown>).openToRelocate),
        completionPercentage: ((authProfile as unknown as Record<string, unknown>).completionPercentage as number | undefined) ?? 0,
        homeState: (authProfile as unknown as Record<string, unknown>).homeState as string | undefined,
        githubPinnedRepos: (authProfile as unknown as Record<string, unknown>).githubPinnedRepos as GithubRepo[] | undefined,
    } : null);

    const githubUsername = extractGithubUsername(profile?.githubUrl);
    const pinnedRepos: GithubRepo[] = Array.isArray(profile?.githubPinnedRepos)
        ? profile.githubPinnedRepos
        : [];

    const seoTitle = `${user?.fullName || 'Candidate'} – ${profile?.headline || 'Software Engineer'} | FresherFlow`;

    useEffect(() => {
        if (typeof document !== 'undefined' && !document.title.includes('FresherFlow')) {
            document.title = seoTitle;
        }
    }, [seoTitle]);

    if (!user || !profile) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
                <div className="flex-1 py-16 px-4 flex items-center justify-center">
                    <div className="max-w-md w-full bg-card border border-border/60 rounded-2xl p-6 md:p-8 text-center space-y-4 shadow-sm">
                        <div className="w-14 h-14 bg-muted text-muted-foreground font-bold text-xl rounded-2xl flex items-center justify-center mx-auto border border-border/50">
                            <UserIcon className="w-7 h-7" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Candidate Profile Not Found</h1>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            No public candidate profile exists for this username.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out shadow-xs"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const initials = (user.fullName || user.username)
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'FF';

    const isOwnProfile = Boolean(
        mounted &&
        authUser &&
        user &&
        (authUser.id === user.id || authUser.username?.toLowerCase() === user.username.toLowerCase())
    );

    const qualificationText = profile.gradCourse
        ? `${profile.gradCourse}${profile.gradSpecialization ? ` ${profile.gradSpecialization}` : ''}${profile.gradYear ? ` ${profile.gradYear}` : ''}`
        : profile.educationLevel || null;

    const headlineText = profile.headline || 'Software Engineer';

    const rawLocation = profile.homeState
        ? profile.homeState
        : profile.preferredCities && profile.preferredCities.length > 0
            ? profile.preferredCities.slice(0, 2).join(', ')
            : 'India';

    const locationText = `${rawLocation}${profile.openToRelocate ? ' • Open to Relocate' : ''}`;
    const availabilityText = formatAvailability(profile.availability);

    const handleShare = async () => {
        const canonicalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://fresherflow.in'}/u/${user.username}`;
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: seoTitle,
                    text: profile.headline || `Check out ${user.fullName || 'Candidate'}'s profile on FresherFlow`,
                    url: canonicalUrl,
                });
            } catch (err: unknown) {
                if ((err as Error).name !== 'AbortError') {
                    await handleCopyLink();
                }
            }
        } else {
            await handleCopyLink();
        }
    };

    const handleCopyLink = async () => {
        const canonicalUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://fresherflow.in'}/u/${user.username}`;
        try {
            await navigator.clipboard.writeText(canonicalUrl);
            setIsCopied(true);
            toast.success('Profile link copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2500);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const candidateProjects: CandidateProject[] = profile.projects || [];
    const skillsList = (profile.skills || []).filter(s => typeof s === 'string' && s.trim().length > 0);
    const displayedSkills = showAllSkills ? skillsList : skillsList.slice(0, 5);
    const hiddenSkillsCount = skillsList.length - 5;

    const hasAbout = Boolean(profile.about && profile.about.trim().length > 0);
    const hasEducation = Boolean(profile.gradCourse || profile.educationLevel || profile.pgCourse || profile.twelfthYear || profile.tenthYear);
    const hasPreferences = Boolean(
        profile.availability ||
        (profile.interestedIn && profile.interestedIn.length > 0) ||
        (profile.preferredRoles && profile.preferredRoles.length > 0) ||
        (profile.preferredCities && profile.preferredCities.length > 0) ||
        (profile.workModes && profile.workModes.length > 0)
    );
    const hasLinks = Boolean(profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl || profile.resumeUrl);
    const hasSkills = skillsList.length > 0;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
            {/* Main Workspace Container with Physical Entrance Animation */}
            <div className={cn(
                "flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 md:space-y-12 transition-all duration-300 ease-out",
                mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.98]"
            )}>
                {/* HERO HEADER CARD */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-4 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Avatar */}
                            {profile.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={profile.avatarUrl}
                                    alt={user.fullName || 'Candidate'}
                                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shrink-0 border border-border/80 shadow-xs"
                                />
                            ) : (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary text-primary-foreground font-extrabold text-xl md:text-2xl flex items-center justify-center shrink-0 shadow-xs">
                                    {initials}
                                </div>
                            )}

                            {/* Candidate Identity */}
                            <div className="space-y-1.5">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                    {user.fullName || 'Candidate'}
                                </h1>

                                <p className="text-sm md:text-base font-medium text-muted-foreground leading-snug">
                                    {headlineText}
                                </p>

                                {/* Badges Row */}
                                <div className="flex items-center gap-2 flex-wrap pt-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-semibold border border-border/60">
                                        <MapPinIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span>{locationText}</span>
                                    </span>

                                    {qualificationText && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-semibold border border-border/60">
                                            <AcademicCapIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                            <span>{qualificationText}</span>
                                        </span>
                                    )}

                                    {/* Availability Status Badge */}
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                                        <span>{availabilityText}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tactile Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                            {isOwnProfile && (
                                <Link
                                    href="/profile"
                                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <PencilSquareIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>Edit Profile</span>
                                </Link>
                            )}

                            <button
                                type="button"
                                onClick={handleShare}
                                className="px-3.5 py-2 bg-card text-foreground font-semibold text-xs rounded-xl border border-border/60 hover:border-border hover:bg-muted/60 active:scale-[0.97] transition-all duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                                title="Share Candidate Profile"
                            >
                                <ShareIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                <span>Share</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleCopyLink}
                                className="px-3.5 py-2 bg-card text-foreground font-semibold text-xs rounded-xl border border-border/60 hover:border-border hover:bg-muted/60 active:scale-[0.97] transition-all duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                                title="Copy Profile Link"
                            >
                                {isCopied ? (
                                    <CheckIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                ) : (
                                    <DocumentDuplicateIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 1. ABOUT SECTION */}
                        {hasAbout && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-3">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-primary shrink-0" />
                                    About
                                </h2>
                                <p
                                    className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line font-normal"
                                    style={!showFullAbout ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
                                >
                                    {profile.about}
                                </p>
                                {profile.about && profile.about.length > 200 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowFullAbout(!showFullAbout)}
                                        className="text-xs font-bold text-primary hover:underline active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer pt-0.5 inline-block"
                                    >
                                        {showFullAbout ? 'Show less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 2. PROJECTS SECTION */}
                        {(candidateProjects.length > 0 || pinnedRepos.length > 0) && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FolderIcon className="w-4 h-4 text-primary shrink-0" />
                                        <span className="tabular-nums">Projects ({candidateProjects.length + pinnedRepos.length})</span>
                                    </h2>
                                    {(profile.githubUrl || githubUsername) && (
                                        <a
                                            href={profile.githubUrl?.startsWith('http') ? profile.githubUrl : `https://github.com/${githubUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline transition-opacity duration-150 ease-out shrink-0"
                                        >
                                            <span>View GitHub →</span>
                                        </a>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* 1. Custom Candidate Projects */}
                                    {candidateProjects.map((proj) => {
                                        const hasLiveUrl = Boolean(proj.liveUrl && proj.liveUrl.trim().length > 0);
                                        const hasGithubUrl = Boolean(proj.githubUrl && proj.githubUrl.trim().length > 0);

                                        return (
                                            <div
                                                key={proj.id || proj.title}
                                                className="group relative bg-muted/20 hover:bg-muted/40 border border-border/60 hover:border-border rounded-xl p-4 space-y-3.5 transition-all duration-150 ease-out active:scale-[0.98] flex flex-col justify-between"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <h3 className="font-bold text-base text-foreground tracking-tight truncate">
                                                            {proj.title}
                                                        </h3>

                                                        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                                                            {hasLiveUrl && (
                                                                <a
                                                                    href={proj.liveUrl?.startsWith('http') ? proj.liveUrl : `https://${proj.liveUrl}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2.5 py-1 text-xs rounded-lg shrink-0 bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out font-bold inline-flex items-center justify-center gap-1 shadow-2xs"
                                                                >
                                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                                    <span>Live Demo →</span>
                                                                </a>
                                                            )}
                                                            {hasGithubUrl && (
                                                                <a
                                                                    href={proj.githubUrl?.startsWith('http') ? proj.githubUrl : `https://${proj.githubUrl}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2.5 py-1 text-xs rounded-lg shrink-0 text-muted-foreground hover:text-foreground bg-card hover:bg-accent border border-border/60 active:scale-[0.97] transition-all duration-150 ease-out font-semibold inline-flex items-center justify-center gap-1 shadow-2xs"
                                                                >
                                                                    <GithubSvgIcon className="w-3.5 h-3.5" />
                                                                    <span>Git Docs →</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {proj.description && (
                                                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                            {proj.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {proj.skills && proj.skills.length > 0 && (
                                                    <div className="flex items-center gap-1.5 pt-1 flex-wrap text-xs">
                                                        {proj.skills.map((skill, idx) => (
                                                            <SkillPill
                                                                key={idx}
                                                                skill={skill}
                                                                className="bg-card text-foreground font-semibold text-[11px] rounded-md border border-border/60"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* 2. Pinned GitHub Repos */}
                                    {pinnedRepos.map((repo) => {
                                        const timeAgo = formatRepoUpdated(repo.updated_at);
                                        const hasHomepage = Boolean(repo.homepage && repo.homepage.trim().length > 0);

                                        return (
                                            <div
                                                key={repo.id || repo.name}
                                                className="group relative bg-muted/20 hover:bg-muted/40 border border-border/60 hover:border-border rounded-xl p-4 space-y-3.5 transition-all duration-150 ease-out active:scale-[0.98] flex flex-col justify-between"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <a
                                                            href={repo.html_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-bold text-base text-foreground hover:text-primary tracking-tight transition-colors duration-150 ease-out hover:underline truncate"
                                                        >
                                                            {repo.name}
                                                        </a>

                                                        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                                                            {hasHomepage && (
                                                                <a
                                                                    href={repo.homepage?.startsWith('http') ? repo.homepage : `https://${repo.homepage}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2.5 py-1 text-xs rounded-lg shrink-0 bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out font-bold inline-flex items-center justify-center gap-1 shadow-2xs"
                                                                >
                                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                                    <span>Live Demo →</span>
                                                                </a>
                                                            )}
                                                            <a
                                                                href={repo.html_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-2.5 py-1 text-xs rounded-lg shrink-0 text-muted-foreground hover:text-foreground bg-card hover:bg-accent border border-border/60 active:scale-[0.97] transition-all duration-150 ease-out font-semibold inline-flex items-center justify-center gap-1 shadow-2xs"
                                                            >
                                                                <GithubSvgIcon className="w-3.5 h-3.5" />
                                                                <span>GitHub →</span>
                                                            </a>
                                                        </div>
                                                    </div>

                                                    {repo.description && (
                                                        <p
                                                            className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
                                                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                                        >
                                                            {repo.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2.5 pt-1 flex-wrap text-xs">
                                                    {repo.language && (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-card text-foreground font-semibold text-[11px] rounded-md border border-border/60">
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                    {typeof repo.stargazers_count === 'number' && repo.stargazers_count > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary font-bold text-[11px] rounded-md border border-primary/20 tabular-nums">
                                                            <StarSolidIcon className="w-3 h-3 text-primary" /> {repo.stargazers_count}
                                                        </span>
                                                    )}
                                                    {timeAgo && (
                                                        <span className="text-[11px] font-medium text-muted-foreground">
                                                            {timeAgo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. SKILLS SECTION */}
                        {hasSkills && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <WrenchScrewdriverIcon className="w-4 h-4 text-primary shrink-0" />
                                    Skills
                                </h2>

                                <div className="flex flex-wrap gap-2">
                                    {displayedSkills.map((skill) => (
                                        <SkillPill
                                            key={skill}
                                            skill={skill}
                                            className="bg-muted/30 border border-border/60 hover:border-border text-foreground font-semibold text-xs rounded-xl hover:bg-muted/60 transition-all duration-150 ease-out cursor-default"
                                        />
                                    ))}

                                    {!showAllSkills && hiddenSkillsCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllSkills(true)}
                                            className="inline-flex items-center px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-muted font-bold text-xs rounded-xl border border-border/60 active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer tabular-nums"
                                        >
                                            +{hiddenSkillsCount} more
                                        </button>
                                    )}

                                    {showAllSkills && skillsList.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllSkills(false)}
                                            className="inline-flex items-center px-3 py-1.5 text-muted-foreground hover:text-foreground font-medium text-xs rounded-xl active:scale-[0.97] transition-all duration-150 ease-out cursor-pointer"
                                        >
                                            Show less
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. EDUCATION STEPPER (Connected Timeline) */}
                        {hasEducation && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <AcademicCapIcon className="w-4 h-4 text-primary shrink-0" />
                                    Education
                                </h2>

                                <div className="border-l-2 border-primary/20 ml-3 pl-6 space-y-8 py-1">
                                    {/* Post Graduation */}
                                    {profile.pgCourse && (
                                        <div className="relative group">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary ring-4 ring-primary/10 transition-transform duration-150 ease-out group-hover:scale-110" />
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                                                        {profile.pgCourse}
                                                    </h3>
                                                    <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                                                        {profile.collegeName || 'Post Graduation Institution'}
                                                    </p>
                                                    {profile.pgSpecialization && (
                                                        <div className="pt-1">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 bg-muted text-foreground font-semibold text-[11px] rounded-md border border-border/50">
                                                                {profile.pgSpecialization}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.pgYear && (
                                                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border/60 shrink-0 self-start tabular-nums">
                                                        <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                        <span>{profile.pgYear}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Graduation */}
                                    {(profile.gradCourse || profile.educationLevel) && (
                                        <div className="relative group">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary ring-4 ring-primary/10 transition-transform duration-150 ease-out group-hover:scale-110" />
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                                                        {[profile.gradCourse || profile.educationLevel].filter(Boolean).join(' ')}
                                                    </h3>
                                                    <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                                                        {[profile.collegeName, profile.collegeState].filter(Boolean).join(' • ') || 'Undergraduate Institution'}
                                                    </p>
                                                    {profile.gradSpecialization && (
                                                        <div className="pt-1">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 bg-muted text-foreground font-semibold text-[11px] rounded-md border border-border/50">
                                                                {profile.gradSpecialization}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.gradYear && (
                                                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border/60 shrink-0 self-start tabular-nums">
                                                        <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                        <span>{profile.gradYear}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Secondary / Senior Secondary */}
                                    {profile.twelfthYear && (
                                        <div className="relative group">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary ring-4 ring-primary/10 transition-transform duration-150 ease-out group-hover:scale-110" />
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                                                        12th Standard / Higher Secondary
                                                    </h3>
                                                    <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                                                        Higher Secondary School Certificate
                                                    </p>
                                                    <div className="pt-1">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 bg-muted text-foreground font-semibold text-[11px] rounded-md border border-border/50">
                                                            HSC / Senior Secondary
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border/60 shrink-0 self-start tabular-nums">
                                                    <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                    <span>{profile.twelfthYear}</span>
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {profile.tenthYear && (
                                        <div className="relative group">
                                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary ring-4 ring-primary/10 transition-transform duration-150 ease-out group-hover:scale-110" />
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                                                        10th Standard (SSC)
                                                    </h3>
                                                    <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                                                        Secondary School Certificate
                                                    </p>
                                                    <div className="pt-1">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 bg-muted text-foreground font-semibold text-[11px] rounded-md border border-border/50">
                                                            SSC / High School
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-secondary-foreground font-bold rounded-xl border border-border/60 shrink-0 self-start tabular-nums">
                                                    <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                                                    <span>{profile.tenthYear}</span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    {/* 1. CAREER PREFERENCES SECTION */}
                        {hasPreferences && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-primary shrink-0" />
                                    Career Preferences
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 text-xs md:text-sm">
                                    {profile.availability && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors duration-150 ease-out">
                                            <ClockIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Availability</p>
                                                <p className="font-bold text-foreground pt-0.5">
                                                    {formatAvailability(profile.availability)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {profile.preferredRoles && profile.preferredRoles.length > 0 && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors duration-150 ease-out">
                                            <UserGroupIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Target Roles</p>
                                                <p className="font-semibold text-foreground pt-0.5">
                                                    {profile.preferredRoles.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {profile.preferredCities && profile.preferredCities.length > 0 && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors duration-150 ease-out">
                                            <MapPinIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Target Cities</p>
                                                <p className="font-semibold text-foreground pt-0.5">
                                                    {profile.preferredCities.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {profile.workModes && profile.workModes.length > 0 && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors duration-150 ease-out">
                                            <BuildingOffice2Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Work Modes</p>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {profile.workModes.map(mode => (
                                                        <span key={mode} className="px-2 py-0.5 bg-card text-foreground font-semibold text-[11px] rounded-md border border-border/60">
                                                            {formatWorkMode(mode)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {profile.interestedIn && profile.interestedIn.length > 0 && (
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors duration-150 ease-out sm:col-span-2 lg:col-span-1">
                                            <BookmarkSquareIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Interested In</p>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {profile.interestedIn.map(item => (
                                                        <span key={item} className="px-2 py-0.5 bg-card text-foreground font-semibold text-[11px] rounded-md border border-border/60">
                                                            {formatOpportunityType(item)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. LINKS SECTION */}
                        {hasLinks && (
                            <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-xs space-y-3.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                                    Links
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 text-xs md:text-sm">
                                    {profile.githubUrl && (
                                        <a
                                            href={profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out group text-foreground font-bold"
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <GithubSvgIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                                                <span className="truncate">GitHub</span>
                                            </div>
                                            <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 ease-out">↗</span>
                                        </a>
                                    )}

                                    {profile.linkedinUrl && (
                                        <a
                                            href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out group text-foreground font-bold"
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <LinkedinSvgIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                                                <span className="truncate">LinkedIn</span>
                                            </div>
                                            <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 ease-out">↗</span>
                                        </a>
                                    )}

                                    {profile.portfolioUrl && (
                                        <a
                                            href={profile.portfolioUrl.startsWith('http') ? profile.portfolioUrl : `https://${profile.portfolioUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out group text-foreground font-bold"
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <GlobeAltIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                                                <span className="truncate">Portfolio</span>
                                            </div>
                                            <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 ease-out">↗</span>
                                        </a>
                                    )}

                                    {profile.resumeUrl && (
                                        <a
                                            href={profile.resumeUrl.startsWith('http') ? profile.resumeUrl : `https://${profile.resumeUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98] transition-all duration-150 ease-out group text-foreground font-bold"
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <DocumentTextIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                                                <span className="truncate">Resume</span>
                                            </div>
                                            <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 ease-out">↗</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        
{/* STANDALONE ROUTE FOOTER NOTE (No hardcoded <footer> tag per Rule 6) */}
                <div className="py-6 text-center border-t border-border/40 mt-12 bg-card/30 rounded-xl">
                    <p className="text-xs font-medium text-muted-foreground">
                        Built with FresherFlow •{' '}
                        <Link href="/opportunities" className="font-bold text-foreground hover:text-primary transition-colors duration-150 ease-out">
                            Explore Verified Fresher Jobs →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
