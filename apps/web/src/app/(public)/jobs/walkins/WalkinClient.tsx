'use client';

import CategoryPage from '@/features/opportunities/components/CategoryPage';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { OpportunityType } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { useMemo } from 'react';

export default function WalkinClient({ initialData }: { initialData: any }) {
    const searchParams = useSearchParams();
    const city = searchParams?.get('location');
    const day = searchParams?.get('day');

    const TopContent = useMemo(() => {
        const getUrl = (key: string, value: string) => {
            const params = new URLSearchParams(searchParams?.toString() || '');
            if (params.get(key) === value) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
            return `/jobs/walkins?${params.toString()}`;
        };

        return (
            <div className="flex flex-col gap-2 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0 mr-1">Time</span>
                    {['Today', 'Tomorrow', 'This Week'].map(d => {
                        const val = d.toLowerCase();
                        const isActive = day === val;
                        return (
                            <Link
                                key={d}
                                href={getUrl('day', val)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border",
                                    isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
                                )}
                            >
                                {d}
                            </Link>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0 mr-1">City</span>
                    {['Bengaluru', 'Hyderabad', 'Pune', 'Delhi NCR', 'Chennai', 'Mumbai'].map(c => {
                        const isActive = city === c;
                        return (
                            <Link
                                key={c}
                                href={getUrl('location', c)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border",
                                    isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
                                )}
                            >
                                {c}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }, [searchParams, city, day]);

    return (
        <CategoryPage 
            type={OpportunityType.WALKIN} 
            initialData={initialData}
            topContent={TopContent}
            customTitle="Walk-In Drives"
        />
    );
}
