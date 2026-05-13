'use client';

import { useAuth } from '@/features/auth';
import Link from 'next/link';
import {
    ArrowRightOnRectangleIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    ArrowLeftIcon,
    BellAlertIcon,
    ChatBubbleBottomCenterTextIcon,
    ChevronRightIcon,
    EnvelopeIcon,
    UserGroupIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import LoadingScreen from '@/features/system/components/ui/LoadingScreen';

export default function AccountPage() {
    const { user, isLoading, logout } = useAuth();

    if (isLoading) return <LoadingScreen message="Loading..." />;

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center space-y-5 animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto border border-border/50">
                        <UserCircleIcon className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Sign in required</h1>
                        <p className="text-muted-foreground text-sm">Please sign in to manage your account.</p>
                    </div>
                    <Link href="/login" className="premium-button mx-auto !w-fit px-8 h-9 text-sm">Sign in</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-500 pb-20 font-sans">
            <main className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-10">

                {/* ── Top nav bar (same on all sizes) ── */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95 group">
                            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Account</h1>
                    </div>
                    <button
                        onClick={logout}
                        className="h-8 px-3 inline-flex items-center gap-1.5 text-red-500 font-semibold border border-red-500/20 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition-all text-xs active:scale-95"
                    >
                        <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
                        Sign out
                    </button>
                </div>

                {/* ── Two-column on desktop, single on mobile ── */}
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 md:gap-8 items-start">

                    {/* ── LEFT: Identity Panel (sticky on desktop) ── */}
                    <div className="md:sticky md:top-8 space-y-3">
                        {/* Avatar + Name card */}
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">

                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-2xl font-extrabold shadow-inner ring-4 ring-background">
                                    {user.fullName?.[0].toUpperCase() || user.email?.[0].toUpperCase()}
                                </div>
                                <div className="space-y-1 w-full">
                                    <h2 className="text-base font-bold tracking-tight text-foreground truncate">{user.fullName || 'User'}</h2>
                                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs font-medium">
                                        <EnvelopeIcon className="w-3 h-3 shrink-0 opacity-60" />
                                        <span className="truncate">{user.email}</span>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                    <ShieldCheckIcon className="w-3 h-3" /> Active session
                                </span>
                            </div>
                        </div>

                        {/* Build tag — desktop only */}
                        <p className="hidden md:block text-center text-[10px] font-bold text-muted-foreground/25 pt-1">FF-GENA-2026-X2</p>
                    </div>

                    {/* ── RIGHT: Menu Sections ── */}
                    <div className="space-y-5">

                        <MenuSection label="General">
                            <MenuRow href="/profile" icon={UserCircleIcon} title="Profile Settings" subtitle="Education, skills and career preferences" />
                        </MenuSection>

                        <MenuSection label="Community">
                            <MenuRow href="/referral" icon={UserGroupIcon} title="Invite Friends" subtitle="Share your link · earn badges as your network grows" />
                            <MenuRow href="/submit-link" icon={LinkIcon} title="Submit a Job Link" subtitle="Help the community by sharing job links" />
                        </MenuSection>

                        <MenuSection label="App settings">
                            <MenuRow href="/account/alerts" icon={BellAlertIcon} title="Alerts" subtitle="Daily digests and closing-soon notifications" />
                            <MenuRow href="/account/feedback" icon={ChatBubbleBottomCenterTextIcon} title="Feedback" subtitle="Share ideas or report bugs" />
                        </MenuSection>

                        {/* Build tag — mobile only */}
                        <p className="md:hidden text-center text-[10px] font-bold text-muted-foreground/25 pt-2">FF-GENA-2026-X2</p>
                    </div>

                </div>
            </main>
        </div>
    );
}

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-muted-foreground px-1">{label}</h3>
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
                {children}
            </div>
        </div>
    );
}

function MenuRow({ href, icon: Icon, title, subtitle }: { href: string; icon: React.ElementType; title: string; subtitle: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors duration-150"
        >
            <div className="w-9 h-9 rounded-xl bg-foreground/[0.05] text-foreground/60 flex items-center justify-center shrink-0 border border-border/50 group-hover:bg-foreground group-hover:text-background group-hover:border-foreground transition-all duration-200">
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </Link>
    );
}
