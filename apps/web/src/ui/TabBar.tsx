'use client';

import Link from 'next/link';
import { cn } from '@/ui/cn';

export interface TabBarItem {
    key: string;
    label: string;
    /** Full link target. Buttons inside a tab (e.g. profile sections) use `action` instead. */
    href?: string;
    action?: () => void;
}

interface TabBarProps {
    items: TabBarItem[];
    activeKey: string;
    onSelect?: (key: string) => void;
    className?: string;
}

/**
 * Shared pill tab-bar for /settings, /community and /resources.
 *
 * `onSelect` switches in place where a client router exists, otherwise
 * links navigate.
 */
export function TabBar({ items, activeKey, onSelect, className }: TabBarProps) {
    return (
        <div className={cn('w-full max-w-7xl mx-auto px-3 md:px-6 pt-4', className)}>
            <div className="flex gap-1 overflow-x-auto bg-muted/40 p-1 rounded-xl w-fit max-w-full">
                {items.map((item) => {
                    const isActive = item.key === activeKey;
                    const classes = cn(
                        'px-3 py-1.5 text-xs font-bold tracking-widest rounded-lg transition-all whitespace-nowrap',
                        isActive
                            ? 'bg-card shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    );
                    return item.href ? (
                        <Link key={item.href} href={item.href} className={classes}>
                            {item.label}
                        </Link>
                    ) : (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => (item.action ? item.action() : onSelect?.(item.key))}
                            className={classes}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
