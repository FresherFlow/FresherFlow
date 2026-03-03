'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { opportunitiesApi, savedApi } from '@/lib/api/client';
import type { Opportunity } from '@fresherflow/types';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import JobCard from '@/features/jobs/components/JobCard';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';

type JobCardOpportunity = Opportunity & { matchScore?: number; matchReason?: string };

export default function DeadlinesPage() {
    const [items, setItems] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await opportunitiesApi.list({ closingSoon: true }) as { opportunities: Opportunity[] };
                const opportunities = (data.opportunities || []) as Opportunity[];
                const active = opportunities.filter((o) => !o.expiresAt || new Date(o.expiresAt) > new Date());
                setItems(active);
            } catch (err: unknown) {
                setError((err as Error)?.message || 'Could not load closing deadlines');
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, []);

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
                        <Link href="/dashboard" className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
                            <ArrowLeftIcon className="w-3.5 h-3.5" />
                            Back
                        </Link>
                        <h1 className="text-sm md:text-base font-bold tracking-tight">Deadline Radar</h1>
                        <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-foreground dark:text-amber-300">{sorted.length} active</span>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <SkeletonJobCard key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-dashed border-border bg-card p-5 space-y-3">
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <Button variant="outline" onClick={() => router.refresh()} className="h-8 px-3 text-xs md:text-sm font-bold uppercase tracking-widest">
                                Retry
                            </Button>
                        </div>
                    ) : sorted.length === 0 ? (
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
