'use client';

import React, { useEffect, useState } from 'react';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { ClockIcon } from '@heroicons/react/24/outline';
import { slugify } from '@fresherflow/utils/slugify';
import { useRouter } from 'next/navigation';

export interface RecentlyViewedItem {
    name: string;
    logoUrl?: string;
    roleCount?: number;
    href?: string;
}

interface RecentlyViewedRowProps {
    fallbackCompanies?: { name: string; roleCount?: number; logoUrl?: string }[];
}

const STORAGE_KEY = 'ff_recently_viewed_companies';

export const RecentlyViewedRow: React.FC<RecentlyViewedRowProps> = ({ fallbackCompanies = [] }) => {
    const router = useRouter();
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
                logoUrl: (c as { logoUrl?: string }).logoUrl,
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
        router.push(item.href || `/companies/${slugify(item.name)}`);
    };

    return (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shrink-0">
                <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Recent
            </span>
            {recentItems.map((item) => (
                <button
                    key={item.name}
                    onClick={() => handleItemClick(item)}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shrink-0"
                >
                    <CompanyLogo
                        companyName={item.name}
                        companyLogoUrl={item.logoUrl}
                        className="w-5 h-5 shrink-0 rounded-full"
                    />
                    <span className="truncate max-w-27.5">{item.name}</span>
                    {item.roleCount !== undefined && item.roleCount > 0 && (
                        <span className="tabular-nums text-muted-foreground">{item.roleCount}</span>
                    )}
                </button>
            ))}
        </div>
    );
};
