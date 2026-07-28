'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    BriefcaseIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    BuildingOfficeIcon,
    ArrowLeftOnRectangleIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const navItems = [
        { href: '/recruiter/dashboard', label: 'Dashboard', icon: BriefcaseIcon },
        { href: '/recruiter/candidates', label: 'Candidate Discovery', icon: MagnifyingGlassIcon },
        { href: '/recruiter/interests', label: 'Hiring Requests', icon: SparklesIcon },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Recruiter Workspace Header - Fixed & Stable */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/80 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">

                    {/* Logo & Recruiter Title */}
                    <div className="flex items-center gap-3">
                        <Link href="/recruiter/dashboard" className="flex items-center gap-2.5 group">
                            <Image
                                src="/fresherflow-logo-v2.png"
                                alt="FresherFlow"
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-xl shrink-0"
                            />
                            <div className="flex flex-col">
                                <span className="text-base font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                                    FresherFlow
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Recruiter Workspace
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Recruiter Nav Links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                        isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User & Mode Switcher */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            className="px-3.5 py-1.5 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition-colors border border-border/60 flex items-center gap-1.5"
                            title="Switch to Candidate View"
                        >
                            <UserCircleIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="hidden sm:inline">Candidate View</span>
                        </Link>

                        {user && (
                            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                    {(user.fullName || user.username || 'R').charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-xs font-bold text-foreground leading-none">{user.fullName || `@${user.username}`}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Verified Recruiter</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Recruiter Content */}
            <main className="flex-1 pt-16">
                {children}
            </main>
        </div>
    );
}
