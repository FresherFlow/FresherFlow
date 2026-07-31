'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';
import {
    UserIcon,
    BookmarkIcon,
    BriefcaseIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    ArrowLeftOnRectangleIcon,
    CheckBadgeIcon,
    GlobeAltIcon,
    LinkIcon,
    AcademicCapIcon,
    Cog6ToothIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    ShareIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { VisibilitySettingsCard } from '@/features/account/components/VisibilitySettingsCard';

export default function AccountHubPage() {
    const router = useRouter();
    const { user, profile } = useAuth();

    const handleSharePlatform = async () => {
        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup` : 'https://fresherflow.in';
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'FresherFlow',
                    text: 'Discover top off-campus jobs and walk-in drives for freshers on FresherFlow!',
                    url: shareUrl,
                });
            } catch {
                // User cancelled share
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard!');
        }
    };

    const initials = (user?.fullName || user?.username || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const completionPct = profile?.completionPercentage ?? 0;

    const activityLinks = [
        {
            href: '/profile',
            title: 'Candidate Profile',
            description: 'Update skills, education, bio, and portfolio links',
            icon: UserIcon,
        },
        {
            href: '/tracker',
            title: 'Application Tracker',
            description: 'Track your active off-campus job applications',
            icon: BriefcaseIcon,
        },
        {
            href: '/saved',
            title: 'Saved Opportunities',
            description: 'Bookmarked off-campus jobs and walk-in drives',
            icon: BookmarkIcon,
        },
        {
            href: '/followed-companies',
            title: 'Followed Companies',
            description: 'Manage hiring channels and companies you follow',
            icon: BuildingOfficeIcon,
        },
    ];

    const platformLinks = [
        {
            href: '/notifications',
            title: 'Notifications',
            description: 'View your job updates and unread alerts',
            icon: BellIcon,
        },
        {
            href: '/alerts',
            title: 'Alert Settings',
            description: 'Notification preferences and channel toggles',
            icon: Cog6ToothIcon,
        },
        {
            href: '/contribute',
            title: 'Submit Missed Job Link',
            description: 'Submit missing off-campus or walk-in drive links',
            icon: LinkIcon,
        },
        {
            href: '/resources',
            title: 'Resources & Career Guides',
            description: 'DSA cheat sheets, aptitude guides, and technical prep',
            icon: AcademicCapIcon,
        },
        {
            href: '/feedback',
            title: 'Submit Feedback & Support',
            description: 'Send feedback and track your submission history',
            icon: ChatBubbleLeftRightIcon,
        },
        {
            href: '/referral',
            title: 'Referrals & Community',
            description: 'Share links, invite friends, and view community karma',
            icon: UserGroupIcon,
        },
        {
            href: '/settings',
            title: 'Settings & Security',
            description: 'Manage account credentials and security settings',
            icon: Cog6ToothIcon,
        },
    ];

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 md:py-8 space-y-4 sm:space-y-6">
                    {/* Header Title */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                Account & Settings
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Manage your candidate profile, recruiter visibility, and platform preferences.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                        {/* LEFT COLUMN: Identity & Visibility */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* Card 1: Profile Identity & Completion */}
                            <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-3.5">
                                    {profile?.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt={user?.fullName || ''} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
                                            {initials}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h2 className="text-base font-bold text-foreground truncate">
                                                {user?.fullName || `@${user?.username}`}
                                            </h2>
                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                                <CheckBadgeIcon className="w-3 h-3" /> Candidate
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user?.username ? `@${user.username}` : 'No handle set'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                </div>

                                {/* Completion Bar */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between items-center text-xs font-semibold">
                                        <span className="text-muted-foreground">Profile Strength</span>
                                        <span className="text-primary font-bold">
                                            {completionPct === 100 ? '100% Market Ready' : `${completionPct}% Complete`}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-300"
                                            style={{ width: `${completionPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {!user?.username ? (
                                        <Link
                                            href="/choose-username"
                                            className="col-span-2 py-2 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <GlobeAltIcon className="w-4 h-4" />
                                            <span>Set Unique Handle</span>
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={`/u/${user.username}`}
                                                target="_blank"
                                                className="py-2 px-3 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <GlobeAltIcon className="w-4 h-4 text-primary shrink-0" />
                                                <span className="truncate">Public Link</span>
                                            </Link>
                                            <Link
                                                href="/profile"
                                                className="py-2 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <PencilSquareIcon className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Edit Profile</span>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Merged Visibility & Discoverability Card */}
                            {profile && <VisibilitySettingsCard />}

                            {/* Card 3: Quick Actions (Share & Sign Out) */}
                            <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                                <div>
                                    <h3 className="text-xs font-bold text-foreground">Invite Friends & Community</h3>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                        Share FresherFlow with freshers seeking off-campus job opportunities.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSharePlatform}
                                    className="w-full py-2 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    <ShareIcon className="w-4 h-4" />
                                    <span>Share Platform</span>
                                </button>

                                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-3">
                                    <span className="text-xs text-muted-foreground font-medium">Session</span>
                                    <Link
                                        href="/logout"
                                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                                    >
                                        <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
                                        <span>Log Out</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Grouped Account Links Grid */}
                        <div className="lg:col-span-8 space-y-5">
                            {/* Section 1: Your Activity */}
                            <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Your Activity
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                    {activityLinks.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="group bg-background border border-border/60 hover:border-primary/40 rounded-xl p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-all flex items-start gap-3 sm:gap-3.5"
                                            >
                                                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/60 text-foreground shrink-0 group-hover:border-primary/40 group-hover:text-primary group-hover:scale-105 transition-all">
                                                    <Icon className="w-4.5 h-4.5" />
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {item.title}
                                                        </h3>
                                                        <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Platform & Help */}
                            <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Platform & Help
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                    {platformLinks.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="group bg-background border border-border/60 hover:border-primary/40 rounded-xl p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-all flex items-start gap-3 sm:gap-3.5"
                                            >
                                                <div className="p-2.5 rounded-xl border border-border/40 bg-muted/60 text-foreground shrink-0 group-hover:border-primary/40 group-hover:text-primary group-hover:scale-105 transition-all">
                                                    <Icon className="w-4.5 h-4.5" />
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {item.title}
                                                        </h3>
                                                        <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}
