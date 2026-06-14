'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/lib/auth/AdminContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { cn } from '@repo/ui/utils/cn';
import { AdminFeedbackSkeleton } from '@/ui/Skeleton';
import {
    ChatBubbleBottomCenterTextIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    PencilSquareIcon,
    TrashIcon,
    FlagIcon,
    ClockIcon,
    UserIcon,
    StarIcon,
} from '@heroicons/react/24/outline';

import { database } from '@/lib/api/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useFirebaseAdmin } from '@/lib/hooks/useFirebaseAdmin';


interface UserProfile {
    fullName?: string;
    email?: string;
    username?: string;
}

interface FirebaseOpportunityReport {
    id: string;
    jobId: string;
    reason: string;
    createdAt: number;
    userId: string;
    user?: UserProfile;
    opportunity?: {
        title: string;
        company: string;
        slug?: string;
    };
}

interface FirebaseAppFeedback {
    id: string;
    type: string;
    rating?: number;
    message: string;
    createdAt: number;
    userId: string;
    user?: UserProfile;
}

interface LiveCommentItem {
    id: string;
    jobId: string;
    text: string;
    createdAt: string;
    user: {
        id: string;
        fullName?: string | null;
        username?: string | null;
    };
    opportunity?: {
        title: string;
        company: string;
        slug?: string;
    };
}

type TabType = 'opportunity-reports' | 'app-feedback' | 'live-comments';

export default function FeedbackPage() {
    const { isAuthenticated: isSessionAuth } = useAdmin();
    const { isAuthenticated: isFbAuth, isAuthenticating: isFbAuthenticating } = useFirebaseAdmin();
    const router = useRouter();
    
    const [activeTab, setActiveTab] = useState<TabType>('opportunity-reports');
    const [isLoading, setIsLoading] = useState(true);
    const [loadingListings, setLoadingListings] = useState(false);

    // Live State Streams
    const [oppReports, setOppReports] = useState<FirebaseOpportunityReport[]>([]);
    const [appFeedback, setAppFeedback] = useState<FirebaseAppFeedback[]>([]);
    const [liveComments, setLiveComments] = useState<LiveCommentItem[]>([]);

    // PostgreSQL Opportunity Lookup Cache to map jobIds to names
    const [opportunityLookup, setOpportunityLookup] = useState<Record<string, { title: string; company: string; slug?: string }>>({});

    // Custom confirm modal state
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        confirmText: string;
        onConfirm: () => void | Promise<void>;
        isLoading?: boolean;
    }>({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Delete',
        onConfirm: () => {},
    });

    // Fetch listings catalog in bulk directly from both the CDN JSON feed and Local DB on mount
    const loadListingsCatalog = useCallback(async () => {
        setLoadingListings(true);
        try {
            const lookup: Record<string, { title: string; company: string; slug?: string }> = {};

            // 1. Fetch the REAL production/staging CDN JSON feed via our server-side secure proxy
            try {
                const res = await fetch('/api/admin/bootstrap-feed', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json() as { opportunities?: any[] };
                    if (data && Array.isArray(data.opportunities)) {
                        data.opportunities.forEach((item) => {
                            lookup[item.id] = {
                                title: item.title,
                                company: item.company,
                                slug: item.slug || undefined,
                            };
                        });
                    }
                }
            } catch (cdnErr) {
                console.warn('CDN JSON fetch failed, falling back:', cdnErr);
            }

            // 2. Fetch from your local development DB so local test jobs (like in your screenshot) map perfectly!
            try {
                const dbRes = await adminApi.getOpportunities({ limit: 1000 }) as {
                    opportunities?: Array<{
                        id: string;
                        title: string;
                        company: string;
                        slug?: string;
                    }>;
                };
                if (dbRes && Array.isArray(dbRes.opportunities)) {
                    dbRes.opportunities.forEach((item) => {
                        // Merge or overwrite (Local DB is most up-to-date for your local testing)
                        lookup[item.id] = {
                            title: item.title,
                            company: item.company,
                            slug: item.slug || undefined,
                        };
                    });
                }
            } catch (dbErr) {
                console.warn('Failed to fetch from local database:', dbErr);
            }

            setOpportunityLookup(lookup);
        } catch (err: unknown) {
            console.error('Failed to pre-cache opportunities names:', err);
        } finally {
            setLoadingListings(false);
        }
    }, []);

    useEffect(() => {
        if (!isSessionAuth) {
            router.push('/admin/login');
            return;
        }
        void loadListingsCatalog();
    }, [isSessionAuth, router, loadListingsCatalog]);

    // ─── Real-Time Firebase Subscriptions ──────────────────────────────────────────
    useEffect(() => {
        if (!isSessionAuth || !isFbAuth) return;

        // 1. Subscribe to Users tree to aggregate reports and app feedbacks
        const usersRef = ref(database, '/users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const reports: FirebaseOpportunityReport[] = [];
            const feedbackList: FirebaseAppFeedback[] = [];

            if (data) {
                Object.entries(data).forEach(([userId, userNode]: [string, any]) => {
                    const profile = userNode.careerProfile || {};
                    const userProfile = {
                        fullName: profile.fullName || profile.personalInfo?.fullName || '',
                        email: profile.email || profile.personalInfo?.email || '',
                        username: profile.username || '',
                    };

                    // Extract opportunity reports
                    const reportsNode = userNode.feedback?.opportunities;
                    if (reportsNode && typeof reportsNode === 'object') {
                        Object.entries(reportsNode).forEach(([jobId, reportItem]: [string, any]) => {
                            reports.push({
                                id: `${userId}_${jobId}`,
                                jobId,
                                reason: reportItem.reason || 'OTHER',
                                createdAt: reportItem.createdAt || Date.now(),
                                userId,
                                user: userProfile,
                            });
                        });
                    }

                    // Extract app feedback
                    const feedbackNode = userNode.feedback?.global;
                    if (feedbackNode && typeof feedbackNode === 'object') {
                        Object.entries(feedbackNode).forEach(([pushId, feedbackItem]: [string, any]) => {
                            feedbackList.push({
                                id: pushId,
                                type: feedbackItem.type || 'FEEDBACK',
                                rating: feedbackItem.rating,
                                message: feedbackItem.message || '',
                                createdAt: feedbackItem.createdAt || Date.now(),
                                userId,
                                user: userProfile,
                            });
                        });
                    }
                });
            }

            // Sort chronologically (newest first)
            reports.sort((a, b) => b.createdAt - a.createdAt);
            feedbackList.sort((a, b) => b.createdAt - a.createdAt);

            setOppReports(reports);
            setAppFeedback(feedbackList);
            setIsLoading(false);
        }, (err) => {
            console.error('[Firebase Users Fetch Fail]', err);
            toast.error('Failed to load community feedback');
            setIsLoading(false);
        });

        // 2. Subscribe to Comments tree
        const commentsRef = ref(database, '/comments');
        const unsubscribeComments = onValue(commentsRef, (snapshot) => {
            const data = snapshot.val();
            const commentsList: LiveCommentItem[] = [];

            if (data) {
                Object.entries(data).forEach(([jobId, jobComments]: [string, any]) => {
                    if (jobComments && typeof jobComments === 'object') {
                        Object.entries(jobComments).forEach(([commentId, commentItem]: [string, any]) => {
                            commentsList.push({
                                id: commentId,
                                jobId,
                                text: commentItem.text || '',
                                createdAt: commentItem.createdAt || new Date().toISOString(),
                                user: {
                                    id: commentItem.user?.id || 'unknown',
                                    fullName: commentItem.user?.fullName || null,
                                    username: commentItem.user?.username || null,
                                }
                            });
                        });
                    }
                });
            }

            // Sort chronologically (newest first)
            commentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLiveComments(commentsList);
        }, (err) => {
            console.error('[Firebase Comments Fetch Fail]', err);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeComments();
        };
    }, [isSessionAuth, isFbAuth]);

    // ─── Moderation Actions ────────────────────────────────────────────────────────
    const handleDeleteComment = (jobId: string, commentId: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Comment',
            description: 'Are you sure you want to delete this comment? This action cannot be undone and will immediately remove the comment from the live feed.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const tid = toast.loading('Deleting comment...');
                try {
                    await remove(ref(database, `/comments/${jobId}/${commentId}`));
                    toast.success('Comment deleted successfully', { id: tid });
                } catch (error) {
                    console.error('Failed to delete comment:', error);
                    toast.error('Failed to delete comment', { id: tid });
                }
            }
        });
    };

    const handleDeleteReport = (userId: string, jobId: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Dismiss Report',
            description: 'Are you sure you want to dismiss this opportunity report? This will remove the report flag from the moderation list.',
            confirmText: 'Dismiss',
            onConfirm: async () => {
                const tid = toast.loading('Dismissing report...');
                try {
                    await remove(ref(database, `/users/${userId}/feedback/opportunities/${jobId}`));
                    toast.success('Report dismissed successfully', { id: tid });
                } catch (error) {
                    console.error('Failed to dismiss report:', error);
                    toast.error('Failed to dismiss report', { id: tid });
                }
            }
        });
    };

    const handleDeleteAppFeedback = (userId: string, pushId: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Delete Feedback',
            description: 'Are you sure you want to delete this app feedback? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                const tid = toast.loading('Deleting feedback...');
                try {
                    await remove(ref(database, `/users/${userId}/feedback/global/${pushId}`));
                    toast.success('Feedback deleted successfully', { id: tid });
                } catch (error) {
                    console.error('Failed to delete feedback:', error);
                    toast.error('Failed to delete feedback', { id: tid });
                }
            }
        });
    };

    if (!isSessionAuth) return null;

    // Map Cached Opportunities Names to current state list
    const mappedReports = oppReports.map((report) => ({
        ...report,
        opportunity: opportunityLookup[report.jobId] || { title: 'Listing ID: ' + report.jobId, company: 'Unsynced Company' },
    }));

    const mappedComments = liveComments.map((comment) => ({
        ...comment,
        opportunity: opportunityLookup[comment.jobId] || { title: 'Listing ID: ' + comment.jobId, company: 'Unsynced Company' },
    }));

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500 text-foreground">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Community moderation</h1>
                    <p className="text-sm text-muted-foreground mt-1 hidden md:flex items-center gap-2 flex-wrap">
                        <span>Monitor active user reports, app feedback, and live opportunity comments.</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            {isFbAuthenticating 
                                ? 'Connecting...' 
                                : isFbAuth 
                                    ? 'Live Sync Active' 
                                    : 'Offline'
                            }
                        </span>
                    </p>
                </div>
                {loadingListings && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                        Syncing PWA CDN Catalog...
                    </span>
                )}
            </header>

            <div className="flex border-b border-border space-x-6">
                {[
                    { id: 'opportunity-reports', label: `Opportunity Reports (${mappedReports.length})`, icon: ExclamationTriangleIcon },
                    { id: 'app-feedback', label: `App Feedback (${appFeedback.length})`, icon: ChatBubbleBottomCenterTextIcon },
                    { id: 'live-comments', label: `Live Comments (${mappedComments.length})`, icon: UserIcon },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 px-1 transition-all',
                                activeTab === tab.id
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Switcher */}
            {isLoading ? (
                <AdminFeedbackSkeleton />
            ) : (
                <div className="pt-2">
                    {/* ─── TAB 1: OPPORTUNITY REPORTS ──────────────────────────────── */}
                    {activeTab === 'opportunity-reports' && (
                        <div className="space-y-4">
                            {mappedReports.length === 0 ? (
                                <div className="rounded-2xl border border-border bg-card p-12 text-center max-w-md mx-auto space-y-3">
                                    <FlagIcon className="w-10 h-10 text-muted-foreground mx-auto" />
                                    <h4 className="text-sm font-bold">All clear</h4>
                                    <p className="text-xs text-muted-foreground">No opportunities reported by the community recently.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {mappedReports.map((report) => (
                                        <div key={report.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm flex flex-col justify-between">
                                            <div className="p-5 space-y-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold line-clamp-1">{report.opportunity?.title}</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{report.opportunity?.company}</p>
                                                    </div>
                                                    <span className={cn(
                                                        'text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase shrink-0 tracking-wider',
                                                        report.reason === 'LINK_BROKEN' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                        report.reason === 'EXPIRED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        'bg-muted text-muted-foreground border-border'
                                                    )}>
                                                        {report.reason.replace('_', ' ')}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 border-t border-border pt-3">
                                                    <div className="w-8 h-8 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                                                        <UserIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold truncate">{report.user?.fullName || report.user?.username || 'Anonymous User'}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{report.user?.email || 'No email registered'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-muted/30 px-5 py-3.5 border-t border-border flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    {new Date(report.createdAt).toLocaleString()}
                                                </span>
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/admin/opportunities/edit/${report.opportunity?.slug || report.jobId}`}
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-secondary/20 px-3 font-semibold text-[11px] transition-colors hover:bg-muted"
                                                    >
                                                        <PencilSquareIcon className="w-3.5 h-3.5" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteReport(report.userId, report.jobId)}
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 font-semibold text-[11px] text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── TAB 2: APP FEEDBACK ─────────────────────────────────────── */}
                    {activeTab === 'app-feedback' && (
                        <div className="space-y-4">
                            {appFeedback.length === 0 ? (
                                <div className="rounded-2xl border border-border bg-card p-12 text-center max-w-md mx-auto space-y-3">
                                    <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-muted-foreground mx-auto" />
                                    <h4 className="text-sm font-bold">No feedback yet</h4>
                                    <p className="text-xs text-muted-foreground">Users have not submitted app feedback recently.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {appFeedback.map((item) => (
                                        <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between gap-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border border-border bg-muted text-muted-foreground uppercase tracking-wider">
                                                        {item.type}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground leading-relaxed font-medium">&ldquo;{item.message}&rdquo;</p>
                                            </div>

                                            <div className="border-t border-border pt-3 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                                        <UserIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold truncate leading-none">{item.user?.fullName || 'Anonymous'}</p>
                                                        <p className="text-[9px] text-muted-foreground truncate mt-0.5">{item.user?.email || 'Anonymous Guest'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {item.rating !== undefined && (
                                                        <div className="flex items-center gap-0.5 text-amber-500 mr-1">
                                                            <StarIcon className="w-3.5 h-3.5 fill-current" />
                                                            <span className="text-xs font-bold">{item.rating}/5</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteAppFeedback(item.userId, item.id)}
                                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                        title="Delete Feedback"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── TAB 3: LIVE COMMENTS MODERATION ──────────────────────────── */}
                    {activeTab === 'live-comments' && (
                        <div className="space-y-4">
                            {mappedComments.length === 0 ? (
                                <div className="rounded-2xl border border-border bg-card p-12 text-center max-w-md mx-auto space-y-3">
                                    <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-muted-foreground mx-auto" />
                                    <h4 className="text-sm font-bold">No active discussions</h4>
                                    <p className="text-xs text-muted-foreground">There are no comments posted under listings.</p>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
                                    {mappedComments.map((comment) => (
                                        <div key={comment.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-muted/10 transition-colors">
                                            <div className="space-y-2.5 min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-xs font-bold text-foreground truncate">
                                                        {comment.user.fullName || `@${comment.user.username}` || 'Anonymous User'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        on {comment.opportunity?.company} — &ldquo;{comment.opportunity?.title}&rdquo;
                                                    </span>
                                                </div>
                                                <p className="text-xs text-foreground leading-normal bg-muted/30 border border-border/40 p-3 rounded-xl max-w-2xl">
                                                    {comment.text}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {new Date(comment.createdAt).toLocaleString()}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDeleteComment(comment.jobId, comment.id)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 font-semibold text-[11px] text-rose-500 hover:bg-rose-500/10 active:scale-95 shrink-0 self-end sm:self-start"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Custom Premium Confirm Modal */}
            {confirmState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-rose-500">
                                <div className="p-2 bg-rose-500/10 rounded-xl">
                                    <ExclamationTriangleIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">{confirmState.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {confirmState.description}
                            </p>
                        </div>
                        <div className="bg-muted/40 px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                            <button
                                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                                disabled={confirmState.isLoading}
                                className="h-9 px-4 rounded-xl border border-border bg-secondary/20 text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setConfirmState(prev => ({ ...prev, isLoading: true }));
                                    try {
                                        await confirmState.onConfirm();
                                    } finally {
                                        setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
                                    }
                                }}
                                disabled={confirmState.isLoading}
                                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {confirmState.isLoading ? (
                                    <>
                                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    confirmState.confirmText
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
