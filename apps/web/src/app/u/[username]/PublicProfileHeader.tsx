'use client';

import Link from 'next/link';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function PublicProfileHeader() {
    const { theme, toggleTheme } = useTheme();
    return (
        <header className="sticky top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
            <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
                {/* Brand Logo & Public Badge */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 flex items-center justify-center text-primary-foreground font-extrabold text-sm shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                            F
                        </div>
                        <span className="font-extrabold text-base md:text-lg tracking-tight text-foreground">
                            Fresher<span className="text-primary">Flow</span>
                        </span>
                    </Link>

                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                        <SparklesIcon className="w-3 h-3" /> Candidate Portfolio
                    </span>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5">
                    <div className="shrink-0">
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>

                    <Link
                        href="/login"
                        className="px-3.5 py-1.5 text-xs font-bold text-foreground hover:text-primary bg-muted/60 hover:bg-muted rounded-xl transition-colors hidden sm:inline-block"
                    >
                        Sign In
                    </Link>

                    <Link
                        href="/recruiter"
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-1.5"
                    >
                        <span>Recruiter Workspace</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}
