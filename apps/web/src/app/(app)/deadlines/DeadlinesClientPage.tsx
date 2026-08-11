'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import JobCard from '@/features/opportunities/components/JobCard';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import { promptLoginToast } from '@/lib/utils/toastUtils';

type JobCardOpportunity = Opportunity & { matchScore?: number; matchReason?: string };

interface DeadlinesClientPageProps {
    initialOpportunities: Opportunity[];
}

export default function DeadlinesClientPage({ initialOpportunities }: DeadlinesClientPageProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);

    const items = useMemo(() => {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return initialOpportunities.filter((o) => {
            if (!o.expiresAt) return false;
            const expiryDate = new Date(o.expiresAt);
            return expiryDate >= now && expiryDate <= threeDaysFromNow;
        });
    }, [initialOpportunities]);

    const sorted = useMemo(() => {
        return items
            .map((opp) => ({ ...opp, isSaved: !!savedJobsMap[opp.id] }))
            .sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime());
    }, [items, savedJobsMap]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }
        try {
            await toggleSavedJob(opportunityId);
            toast.success(savedJobsMap[opportunityId] ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch {
            toast.error('Bookmark update failed');
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
