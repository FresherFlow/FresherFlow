'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { savedApi } from '@/shared/api/client';
import type { Opportunity } from '@fresherflow/types';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import JobCard from '@/features/opportunities/components/JobCard';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';

type JobCardOpportunity = Opportunity & { matchScore?: number; matchReason?: string };

interface DeadlinesClientPageProps {
    initialOpportunities: Opportunity[];
}

export default function DeadlinesClientPage({ initialOpportunities }: DeadlinesClientPageProps) {
    const [items, setItems] = useState<Opportunity[]>(() => {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return initialOpportunities.filter((o) => {
            if (!o.expiresAt) return false;
            const expiryDate = new Date(o.expiresAt);
            return expiryDate >= now && expiryDate <= threeDaysFromNow;
        });
    });

    const sorted = useMemo(
        () => [...items].sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime()),
        [items]
    );

    const toggleSave = async (opportunityId: string) => {
        try {
            const result = await savedApi.toggle(opportunityId) as { saved: boolean };
            setItems((prev) => prev.map((opp) => (opp.id === opportunityId ? { ...opp, isSaved: result.saved } : opp)));
        } catch {
            // no-op
        }
    };

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2 text-xs md:text-sm font-bold capitalize tracking-widest text-muted-foreground hover:text-primary">
                            <ArrowLeftIcon className="w-3.5 h-3.5" />
                            Back
                        </Link>
                        <h1 className="text-sm md:text-base font-bold tracking-tight">Jobs Closing Soon</h1>
                        <span className="text-xs md:text-sm font-bold capitalize tracking-widest text-foreground dark:text-amber-300">{sorted.length} active</span>
                    </div>

                    {sorted.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                            No opportunities closing soon right now.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sorted.map((opp) => (
                                <JobCard
                                    key={opp.id}
                                    job={opp as JobCardOpportunity}
                                    jobId={opp.id}
                                    isApplied={false}
                                    isSaved={opp.isSaved}
                                    onToggleSave={() => toggleSave(opp.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </ProfileGate>
        </AuthGate>
    );
}
