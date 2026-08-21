'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsernameGate } from '@/lib/components/ProfileGate';

import {
    UserIcon,
    BookmarkIcon,
    BriefcaseIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    CheckBadgeIcon,
    LinkIcon,
    AcademicCapIcon,
    Cog6ToothIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';

export default function AccountHubPage() {
    const router = useRouter();
    const { user, profile } = useAuth();

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
        <UsernameGate>
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-4">
                    {/* Header Title */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="p-1.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                            aria-label="Go back"
                        >
                            <ArrowLeftIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                                Account & Settings
                            </h1>
                            <p className="text-[11px] text-muted-foreground">
                                Manage your candidate profile, applications, and platform preferences.
                            </p>
                        </div>
                    </div>

                    {/* 2-Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* LEFT COLUMN: Navigation Links */}
                        <div className="lg:col-span-8 space-y-4">
                            {/* Section 1: Your Activity */}
                            <div className="space-y-2">
                                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                    Your Activity
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {activityLinks.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="group bg-card border border-border/60 hover:border-primary/40 rounded-xl p-3 shadow-2xs hover:shadow-sm transition-all flex items-start gap-3"
                                            >
                                                <div className="p-2 rounded-lg border border-border/40 bg-muted/60 text-foreground shrink-0 group-hover:border-primary/40 group-hover:text-primary transition-all">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {item.title}
                                                        </h3>
                                                        <ArrowRightIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Platform & Community */}
                            <div className="space-y-2">
                                <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                    Platform & Community
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    {platformLinks.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="group bg-card border border-border/60 hover:border-primary/40 rounded-xl p-3 shadow-2xs hover:shadow-sm transition-all flex items-start gap-2.5"
                                            >
                                                <div className="p-2 rounded-lg border border-border/40 bg-muted/60 text-foreground shrink-0 group-hover:border-primary/40 group-hover:text-primary transition-all">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                                            {item.title}
                                                        </h3>
                                                        <ArrowRightIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1 mt-0.5">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Profile Card */}
                        <div className="lg:col-span-4">
                            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm space-y-3.5">
                                <div className="flex items-center gap-3">
                                    {profile?.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={profile.avatarUrl}
                                            alt={user?.fullName || ''}
                                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border/40"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center shrink-0">
                                            {initials}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h2 className="text-sm font-bold text-foreground truncate">
                                                {user?.fullName || `@${user?.username}`}
                                            </h2>
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                                                <CheckBadgeIcon className="w-3 h-3" /> Candidate
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                            {user?.email || (user?.username ? `@${user.username}` : '')}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/profile"
                                    className="w-full py-2 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                    <PencilSquareIcon className="w-3.5 h-3.5" />
                                    <span>Edit Profile</span>
                                </Link>

                                {/* Profile Completion */}
                                <div className="pt-2.5 border-t border-border/40 space-y-1.5">
                                    <div className="flex justify-between items-center text-[11px] font-medium">
                                        <span className="text-muted-foreground">Profile Completion</span>
                                        <span className="text-primary font-bold">
                                            {completionPct === 100 ? '100%' : `${completionPct}%`}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-300"
                                            style={{ width: `${completionPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </UsernameGate>
    );
}

