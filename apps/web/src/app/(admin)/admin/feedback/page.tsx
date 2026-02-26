'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { AdminFeedbackSkeleton } from '@/components/ui/Skeleton';
import {
    ChatBubbleBottomCenterTextIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    PencilSquareIcon,
    TrashIcon,
    FlagIcon,
    ClockIcon,
    UserIcon
} from '@heroicons/react/24/outline';

interface FeedbackItem {
    id: string;
    opportunityId: string;
    reason: string;
    createdAt: string;
    user?: {
        fullName?: string;
    };
    opportunity?: {
        title: string;
        company: string;
        slug?: string;
    };
}

interface AppFeedbackItem {
    id: string;
    type: string;
    rating?: number | null;
    message: string;
    pageUrl?: string | null;
    createdAt: string;
    user?: {
        fullName?: string;
        email?: string;
    };
}

export default function FeedbackPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [appFeedback, setAppFeedback] = useState<AppFeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const [listingData, appData] = await Promise.all([
                adminApi.getFeedback(),
                adminApi.getAppFeedback()
            ]) as [{ feedback: FeedbackItem[] }, { feedback: AppFeedbackItem[] }];
            setFeedback(listingData.feedback || []);
            setAppFeedback(appData.feedback || []);
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadFeedback();
    }, [isAuthenticated, router, loadFeedback]);

    const groupedFeedback = feedback.reduce((acc, fb) => {
        const oppId = fb.opportunityId;
        if (!acc[oppId]) {
            acc[oppId] = {
                opportunity: fb.opportunity,
                items: []
            };
        }
        acc[oppId].items.push(fb);
        return acc;
    }, {} as Record<string, { opportunity?: FeedbackItem['opportunity'], items: FeedbackItem[] }>);

    if (!isAuthenticated) return null;

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
            {/* Sticky Header Section for Mobile Content focus */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md md:relative md:top-auto md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 md:space-y-1">
                        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">User feedback</h1>
                        <p className="text-[10px] md:text-sm text-muted-foreground">Reports and listing issues.</p>
                    </div>
                    <button
                        onClick={loadFeedback}
                        className="inline-flex h-8 md:h-9 items-center justify-center rounded-md border border-input bg-background px-3 md:px-4 text-xs md:text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                        <span className="hidden md:inline">Refresh</span>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {[
                        { label: 'Total Reports', value: feedback.length, icon: ChatBubbleBottomCenterTextIcon, color: 'text-blue-500' },
                        { label: 'Issue Hotspots', value: Object.keys(groupedFeedback).length, icon: ExclamationTriangleIcon, color: 'text-amber-500' },
                        { label: 'Resolution Rate', value: '0%', icon: CheckCircleIcon, color: 'text-emerald-500' }
                    ].map((stat, i) => (
                        <div key={i} className={cn(
                            "bg-card p-2 md:p-5 rounded-lg border border-border shadow-sm flex items-center justify-between",
                            i === 2 && "col-span-2 md:col-span-1" // Make last one span 2 cols on mobile
                        )}>
                            <div className="space-y-0.5 md:space-y-1">
                                <p className="text-[9px] md:text-xs font-medium text-muted-foreground tracking-wide uppercase">{stat.label}</p>
                                <p className="text-sm md:text-2xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                            </div>
                            <div className={cn(
                                "p-1 md:p-2 rounded-full bg-muted/50",
                                stat.color
                            )}>
                                <stat.icon className="w-3 h-3 md:w-5 md:h-5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <AdminFeedbackSkeleton />
            ) : Object.keys(groupedFeedback).length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-lg p-8 md:p-12 text-center space-y-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <FlagIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-sm md:text-base font-semibold text-foreground">All clear</h3>
                    <p className="text-xs md:text-sm text-muted-foreground max-w-sm mx-auto">No user reports have been filed recently.</p>
                </div>
            ) : (
                <div className="space-y-4 md:space-y-6">
                    {Object.entries(groupedFeedback).map(([oppId, data]) => (
                        <div key={oppId} className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                            {/* Opportunity Information */}
                            <div className="bg-muted/40 p-3 md:p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-muted rounded-md border border-border/50 flex items-center justify-center font-bold text-muted-foreground text-[10px] md:text-sm">
                                        {data.opportunity?.company?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h4 className="text-sm md:text-base font-semibold text-foreground leading-tight">
                                            {data.opportunity?.title || 'Unknown Opportunity'}
                                        </h4>
                                        <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
                                            {data.opportunity?.company || 'Unknown Company'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/opportunities/edit/${data.opportunity?.slug || oppId}`}
                                        className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-2 md:px-3 text-[10px] md:text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground flex-1 md:flex-none"
                                    >
                                        <PencilSquareIcon className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5" />
                                        Edit listing
                                    </Link>
                                    <button
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Reports Grid */}
                            <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {data.items.map((fb: FeedbackItem) => (
                                    <div key={fb.id} className="p-3 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={cn(
                                                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                                fb.reason === 'LINK_BROKEN' ? 'bg-rose-50 text-rose-700 ring-rose-600/10' :
                                                    fb.reason === 'EXPIRED' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                                                        'bg-slate-50 text-slate-700 ring-slate-600/10'
                                            )}>
                                                {fb.reason.replace('_', ' ')}
                                            </span>
                                            <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
                                                <ClockIcon className="w-2.5 h-2.5" />
                                                {new Date(fb.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center">
                                                <UserIcon className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] md:text-xs font-medium text-foreground leading-none">
                                                    {fb.user?.fullName || 'Anonymous'}
                                                </p>
                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                                    Reporter
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Strip */}
                            <div className="bg-muted/40 px-3 md:px-4 py-2 border-t border-border flex items-center justify-between">
                                <p className="text-[10px] md:text-xs font-medium text-muted-foreground">
                                    {data.items.length} community report{data.items.length !== 1 ? 's' : ''}
                                </p>
                                <button className="text-[10px] md:text-xs font-medium text-primary hover:underline">
                                    Review
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* App Feedback Section */}
            <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg md:text-xl font-semibold text-foreground">App feedback</h2>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Ideas, bugs, and reviews from users.</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{appFeedback.length} total</span>
                </div>

                {isLoading ? (
                    <AdminFeedbackSkeleton />
                ) : appFeedback.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-lg p-6 md:p-8 text-center text-muted-foreground text-sm">
                        No app feedback yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {appFeedback.map((item) => (
                            <div key={item.id} className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-muted/60 text-foreground">
                                        {item.type}
                                    </span>
                                    <div className="text-[10px] font-medium text-muted-foreground">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">{item.message}</p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>{item.user?.fullName || item.user?.email || 'User'}</span>
                                    {item.rating ? <span>Rating: {item.rating}/5</span> : <span>Rating: n/a</span>}
                                </div>
                                {item.pageUrl ? (
                                    <div className="text-[10px] text-muted-foreground truncate">Page: {item.pageUrl}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

