'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '@/features/auth';
import { savedApi } from '@/shared/api/client';
import type { Opportunity } from '@fresherflow/types';
import { ActionType } from '@fresherflow/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPinIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingScreen from '@/features/system/components/ui/LoadingScreen';
import { getOpportunityPathFromItem } from '@fresherflow/domain';

export default function SavedJobsPage() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const authLoading = context?.isLoading;
    const [savedJobs, setSavedJobs] = useState<Opportunity[]>([]);
    const [fetchingJobs, setFetchingJobs] = useState(true);
    const router = useRouter();

    const loadSavedJobs = useCallback(async () => {
        setFetchingJobs(true);
        try {
            const data = await savedApi.list() as { opportunities: Opportunity[] };
            setSavedJobs(data.opportunities || []);
        } catch (err: unknown) {
            console.error('Error loading saved jobs:', err);
            toast.error('Failed to sync saved jobs');
        } finally {
            setFetchingJobs(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadSavedJobs();
        }
    }, [user, loadSavedJobs]);

    const handleRemove = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const loading = toast.loading('Removing from saved...');
        try {
            await savedApi.toggle(id);
            setSavedJobs(prev => prev.filter(j => j.id !== id));
            toast.success('Opportunity removed', { id: loading });
        } catch {
            toast.error('Failed to remove', { id: loading });
        }
    };

    const getProgressLabel = (job: Opportunity): string | null => {
        const actionType = (job.actions?.[0]?.actionType as ActionType | undefined);
        if (!actionType) return null;
        if (actionType === ActionType.PLANNED || actionType === ActionType.PLANNING) return 'Planned';
        if (actionType === ActionType.INTERVIEWED || actionType === ActionType.ATTENDED) return 'Interviewed';
        if (actionType === ActionType.SELECTED) return 'Selected';
        if (actionType === ActionType.APPLIED) return 'Applied';
        return null;
    };



    if (authLoading) return <LoadingScreen message="Loading..." />;

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="text-center space-y-6 max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-lg">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in required</h1>
                    <p className="text-muted-foreground font-medium">Please sign in to access your saved opportunities.</p>
                    <Link href="/login" className="w-full h-11 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg flex items-center justify-center hover:bg-primary/90 transition-all">Sign in</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-500 pb-12 md:pb-0">
            <main className="max-w-7xl mx-auto px-3 md:px-6 py-5 md:py-10 space-y-4 md:space-y-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved</h1>
                        <p className="text-xs font-medium text-muted-foreground capitalize tracking-widest">Your bookmarked opportunities</p>
                    </div>
                </div>

                {fetchingJobs ? (
                    <div className="bg-card border border-border rounded-xl p-6 md:p-12 text-center text-muted-foreground font-medium">
                        Loading your saved opportunities...
                    </div>
                ) : savedJobs.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-6 md:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
                        <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/50">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold tracking-tight text-foreground">No saved opportunities yet</h2>
                            <p className="text-muted-foreground text-sm font-medium max-w-sm mx-auto">Bookmark listings from the feed to keep them here.</p>
                        </div>
                        <Link
                            href="/opportunities"
                            className="inline-flex h-10 items-center justify-center px-8 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg hover:bg-primary/90 transition-all shadow-md"
                        >
                            Browse feed
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {savedJobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-card group cursor-pointer relative p-4 rounded-xl border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all space-y-3"
                                onClick={() => router.push(getOpportunityPathFromItem(job))}
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground capitalize tracking-widest truncate">{job.company}</p>
                                        <h3 className="font-bold text-foreground text-lg leading-tight truncate pr-2 group-hover:text-primary transition-colors">{job.title}</h3>
                                    </div>
                                    <button
                                        onClick={(e) => handleRemove(e, job.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0"
                                        title="Remove from saved"
                                        aria-label={`Remove ${job.title} from saved jobs`}
                                    >
                                        <TrashIcon className="w-5 h-5" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize tracking-wide border ${job.type === 'WALKIN' ? 'bg-amber-500/10 text-slate-900 dark:text-amber-300 border-amber-500/20' :
                                        job.type === 'INTERNSHIP' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                                            'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                        }`}>
                                        {job.type}
                                    </span>
                                    {getProgressLabel(job) && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize tracking-wide border bg-primary/10 text-primary border-primary/20">
                                            {getProgressLabel(job)}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                                        <MapPinIcon className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-37.5">{job.locations?.[0] || 'Remote'}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
