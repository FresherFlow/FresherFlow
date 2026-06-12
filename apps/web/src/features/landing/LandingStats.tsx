'use client';

import { useEffect, useState, useMemo } from 'react';
import { Opportunity } from '@fresherflow/types';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';

interface LandingStatsProps {
    initialLiveCount: number;
    initialCompaniesCount: number;
}

export function LandingStats({ initialLiveCount, initialCompaniesCount }: LandingStatsProps) {
    const [liveCount, setLiveCount] = useState(initialLiveCount);
    const [companiesCount, setCompaniesCount] = useState(initialCompaniesCount);

    useEffect(() => {
        // If SSR timed out, fetch on client
        if (initialLiveCount === 0 || initialCompaniesCount === 0) {
            fetchBootstrapFeed().then((feed) => {
                if (feed) {
                    setLiveCount(feed.count || feed.opportunities?.length || 0);
                    if (feed.opportunities) {
                        const set = new Set<string>();
                        feed.opportunities.forEach(o => {
                            if (o.company) set.add(o.company);
                        });
                        setCompaniesCount(set.size);
                    }
                }
            }).catch(console.error);
        }
    }, [initialLiveCount, initialCompaniesCount]);

    const stats = [
        { label: 'Active Jobs', value: liveCount > 0 ? liveCount.toLocaleString() : '- -' },
        { label: 'Companies', value: companiesCount > 0 ? companiesCount.toLocaleString() : '- -' },
        { label: 'Fake Listings', value: '0' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-6">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl sm:rounded-2xl border border-border bg-card/65 backdrop-blur p-2.5 sm:p-4.5 shadow-sm text-center flex flex-col justify-center">
                    <div className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        {stat.value}
                    </div>
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wide sm:tracking-widest text-muted-foreground font-bold mt-0.5 sm:mt-1 leading-tight text-center">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
