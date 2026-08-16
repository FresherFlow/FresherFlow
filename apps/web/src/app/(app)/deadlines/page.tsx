'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { ProfileGate } from '@/lib/components/ProfileGate';
import { SkeletonJobCard } from '@/features/opportunities/components/OpportunitySkeletons';
import JobCard from '@/features/opportunities/components/JobCard';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Opportunity } from '@fresherflow/types';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import toast from 'react-hot-toast';
import { promptLoginToast } from '@/lib/utils/toastUtils';

const CACHE_KEY = 'ff_deadlines_cache_v1';
const CACHE_TTL = 5 * 60 * 1000;

function readCache(): { opportunities: Opportunity[]; savedAt: number | null } {
    if (typeof window === 'undefined') return { opportunities: [], savedAt: null };
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return { opportunities: [], savedAt: null };
        const parsed = JSON.parse(raw) as { opportunities?: Opportunity[]; savedAt?: number };
        return {
            opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null,
        };
    } catch {
        return { opportunities: [], savedAt: null };
    }
}

function writeCache(opportunities: Opportunity[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ opportunities, savedAt: Date.now() }));
    } catch { /* ignore quota */ }
}

function DeadlinesPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const cached = readCache();
        if (cached.savedAt && (Date.now() - cached.savedAt) < CACHE_TTL && cached.opportunities.length > 0) {
            setAllOpportunities(cached.opportunities);
            setIsLoading(false);
            return;
        }

        async function load() {
            try {
                const feed = await fetchBootstrapFeed();
                if (feed?.opportunities) {
                    setAllOpportunities(feed.opportunities);
                    writeCache(feed.opportunities);
                }
            } catch {
                /* fail silently — show empty state */
            } finally {
                setIsLoading(false);
            }
        }
        void load();
    }, []);

    const expiringOpps = useMemo(() => {
        const now = new Date();
        const seventy2h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        return allOpportunities
            .filter(o => {
                if (!o.expiresAt) return false;
                const exp = new Date(o.expiresAt);
                return exp > now && exp <= seventy2h;
            })
            .map(o => ({ ...o, isSaved: !!savedJobsMap[o.id] }))
            .sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime());
    }, [allOpportunities, savedJobsMap]);

    const handleToggleSave = async (oppId: string) => {
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
            return;
        }
        await toggleSavedJob(oppId);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            <div className="flex flex-col gap-1">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-xs font-bold capitalize tracking-widest text-muted-foreground hover:text-primary w-fit"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Feed
                </Link>
                <div className="flex items-end justify-between gap-3 mt-2">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                            Closing Soon
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Opportunities expiring within the next 72 hours
                        </p>
                    </div>
                    {!isLoading && (
                        <span className="text-xs font-bold capitalize tracking-widest text-foreground shrink-0">
                            {expiringOpps.length} left
                        </span>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonJobCard key={i} />)}
                </div>
            ) : expiringOpps.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-5 max-w-xl mx-auto shadow-sm">
                    <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-2xl"></span>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <h2 className="text-base font-black tracking-tight text-foreground">You&apos;re all caught up!</h2>
                        <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                            No opportunities are expiring in the next 72 hours. Stay ahead by checking the latest postings in the feed.
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="relative z-10 inline-flex h-10 items-center justify-center px-8 bg-foreground text-background font-bold capitalize tracking-widest text-[10px] rounded-xl hover:opacity-90 transition-all shadow-sm"
                    >
                        Explore Feed
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expiringOpps.map(opp => (
                        <JobCard
                            key={opp.id}
                            job={opp}
                            jobId={opp.id}
                            isSaved={!!savedJobsMap[opp.id]}
                            onToggleSave={() => handleToggleSave(opp.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DeadlinesPage() {
    return (
        <ProfileGate>
            <DeadlinesPageContent />
        </ProfileGate>
    );
}
