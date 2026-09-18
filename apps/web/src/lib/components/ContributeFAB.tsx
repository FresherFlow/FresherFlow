'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@repo/ui/utils/cn';
import { useAuth } from '@/lib/auth/AuthContext';

const POST_TYPES = [
    {
        key: 'job',
        label: 'Job',
        description: 'Share a job or internship opening',
        href: '/contribute',
    },
    {
        key: 'discussion',
        label: 'Discussion',
        description: 'Start a discussion or ask a question',
        href: '/community',
    },
    {
        key: 'interview',
        label: 'Interview Experience',
        description: 'Share your interview experience',
        href: null, // opens inline on job page
    },
    {
        key: 'update',
        label: 'Application Update',
        description: 'Report your application status',
        href: null, // opens inline on job page
    },
];

export function ContributeFAB() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Close on route change
    useEffect(() => { setOpen(false); }, [pathname]);

    // Close on escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    if (!mounted || !user) return null;

    // Hide on auth routes and on the contribute page itself
    if (pathname === '/login' || pathname === '/register' || pathname === '/contribute') return null;

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="lg:hidden fixed inset-0 z-fab bg-black/30 backdrop-blur-sm transition-opacity"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Menu */}
            {open && (
                <div className="lg:hidden fixed bottom-24 right-4 z-fab-raised space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {POST_TYPES.map((type) => (
                        <Link
                            key={type.key}
                            href={type.href ?? '#'}
                            onClick={(e) => {
                                if (!type.href) {
                                    e.preventDefault();
                                    // For interview/update, scroll to the job page discussion section
                                    const section = document.getElementById('discussion');
                                    if (section) {
                                        section.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }
                                setOpen(false);
                            }}
                            className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3 shadow-lg transition-all hover:shadow-xl active:scale-95"
                        >
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground">{type.label}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-40">{type.description}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* FAB */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'lg:hidden fixed bottom-20 right-4 z-fab-raised w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90',
                    open && 'rotate-45 bg-destructive text-destructive-foreground'
                )}
                aria-label={open ? 'Close menu' : 'Create post'}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        </>
    );
}
