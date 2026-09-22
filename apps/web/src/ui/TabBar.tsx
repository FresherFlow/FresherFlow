'use client';

import Link from 'next/link';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/Breadcrumb';
import { cn } from '@/ui/cn';

export interface TabBarItem {
    key: string;
    label: string;
    /** Full link target. Buttons inside a tab (e.g. profile sections) use `action` instead. */
    href?: string;
    action?: () => void;
}

interface TabBarProps {
    /** Single shared UI: pill tab-bar for several links, breadcrumb when only the trail matters. */
    variant?: 'tabs' | 'breadcrumb';
    rootLabel?: string;
    rootHref?: string;
    items: TabBarItem[];
    activeKey: string;
    onSelect?: (key: string) => void;
    className?: string;
}

/**
 * One shared tab-bar for /jobs, /settings, /community and /resources.
 *
 * - `tabs` renders the pill bar. `onSelect` switches in place where a client
 *   router exists, otherwise links navigate.
 * - `breadcrumb` renders Root / Active (Jobs / Saved) — used on /jobs user tabs.
 */
export function TabBar({ variant = 'tabs', rootLabel, rootHref, items, activeKey, onSelect, className }: TabBarProps) {
    if (variant === 'breadcrumb') {
        const active = items.find((i) => i.key === activeKey);
        return (
            <div className={cn('w-full max-w-7xl mx-auto px-3 md:px-6 pt-4', className)}>
                <Breadcrumb>
                    <BreadcrumbList>
                        {rootLabel && (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={rootHref || '/'}>{rootLabel}</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                            </>
                        )}
                        <BreadcrumbItem>
                            <BreadcrumbPage>{active?.label ?? activeKey}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        );
    }

    return (
        <div className={cn('w-full max-w-7xl mx-auto px-3 md:px-6 pt-4', className)}>
            <div className="flex gap-1 overflow-x-auto bg-muted/40 p-1 rounded-xl w-fit max-w-full">
                {items.map((item) => {
                    const isActive = item.key === activeKey;
                    const classes = cn(
                        'px-3 py-1.5 text-xs font-bold capitalize tracking-widest rounded-lg transition-all whitespace-nowrap',
                        isActive
                            ? 'bg-card shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    );
                    return item.href ? (
                        <Link key={item.key} href={item.href} className={classes}>
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
