'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/ui/cn';

const QUEUES = [
    { href: '/moderation/submissions', label: 'Job submissions' },
    { href: '/moderation/interviews', label: 'Interviews' },
    { href: '/moderation/updates', label: 'Hiring updates' },
    { href: '/moderation/resources', label: 'Resources' },
    { href: '/moderation/reports', label: 'Reports' },
    { href: '/moderation/content', label: 'Content' },
];

export function ModerationNav() {
    const pathname = usePathname() || '';
    return (
        <nav aria-label="Moderation queues" className="border-b border-border bg-card">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1 overflow-x-auto px-4 py-2">
                <Link
                    href="/moderation"
                    className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-semibold',
                        pathname === '/moderation' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    )}
                >
                    Overview
                </Link>
                {QUEUES.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'rounded-full px-3 py-1.5 text-sm',
                            pathname === item.href
                                ? 'bg-primary/10 font-semibold text-primary'
                                : 'text-muted-foreground'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
