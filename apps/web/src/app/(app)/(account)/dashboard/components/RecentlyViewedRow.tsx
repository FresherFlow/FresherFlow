'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import CompanyLogo from '@/ui/CompanyLogo';
import { ClockIcon } from '@heroicons/react/24/outline';
import { slugify } from '@fresherflow/utils/slugify';

export interface RecentlyViewedItem {
    name: string;
    logoUrl?: string;
    roleCount?: number;
    href?: string;
}

interface RecentlyViewedRowProps {
    fallbackCompanies?: { name: string; roleCount?: number }[];
}

const STORAGE_KEY = 'ff_recently_viewed_companies';

export const RecentlyViewedRow: React.FC<RecentlyViewedRowProps> = ({ fallbackCompanies = [] }) => {
    const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRecentItems(parsed.slice(0, 6));
                    return;
                }
            }
        } catch {
            // Ignore parse errors
        }

        if (fallbackCompanies.length > 0) {
            setRecentItems(fallbackCompanies.slice(0, 6).map(c => ({
                name: c.name,
                roleCount: c.roleCount,
                href: `/companies/${slugify(c.name)}`,
            })));
        }
    }, [fallbackCompanies]);

    if (recentItems.length === 0) return null;

    const handleItemClick = (item: RecentlyViewedItem) => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            let items: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];
            if (!Array.isArray(items)) items = [];
            items = items.filter(i => i.name.toLowerCase() !== item.name.toLowerCase());
            items.unshift(item);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)));
        } catch {
            // Ignore storage write error
        }
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted/30 text-muted-foreground flex items-center justify-center shrink-0">
                    <ClockIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold tracking-tight text-foreground">Recently Viewed & Quick Access</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {recentItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href || `/companies/${slugify(item.name)}`}
                        onClick={() => handleItemClick(item)}
                        className="group flex items-center gap-3 p-2 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-muted/30 transition-all duration-150 ease-out active:scale-[0.98] overflow-hidden"
                    >
                        <CompanyLogo
                            companyName={item.name}
                            companyLogoUrl={item.logoUrl}
                            className="w-9 h-9 text-xs rounded-lg shrink-0"
                        />
                        <div className="min-w-0 flex-1 pr-1">
                            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {item.name}
                            </p>
                            {item.roleCount !== undefined && item.roleCount > 0 && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {item.roleCount} active {item.roleCount === 1 ? 'role' : 'roles'}
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};
