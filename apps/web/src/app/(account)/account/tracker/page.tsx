'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { actionsApi } from '@/lib/api/client';
import { ActionType } from '@fresherflow/types';
import type { Opportunity } from '@fresherflow/types';
import LoadingScreen from '@/components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
    BriefcaseIcon,
    TrashIcon,
    ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
import { enqueueOfflineActionRemove, enqueueOfflineActionTrack } from '@/lib/offline/actionQueue';
import JobCard from '@/features/jobs/components/JobCard';

type ActionRecord = {
    id: string;
    actionType: ActionType;
    createdAt: string | Date;
    opportunity?: Opportunity;
};

const STATUS_ORDER: ActionType[] = [
    ActionType.APPLIED,
    ActionType.PLANNED,
    ActionType.INTERVIEWED,
    ActionType.SELECTED,
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    APPLIED: { label: 'Applied', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    PLANNED: { label: 'Planned', color: 'text-slate-900 dark:text-amber-300', bgColor: 'bg-amber-50' },
    INTERVIEWED: { label: 'Interviewed', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    SELECTED: { label: 'Selected', color: 'text-green-600', bgColor: 'bg-green-50' },
    PLANNING: { label: 'Planned', color: 'text-slate-900 dark:text-amber-300', bgColor: 'bg-amber-50' },
    ATTENDED: { label: 'Interviewed', color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

const normalizeStatus = (value: ActionType): ActionType => {
    if (value === ActionType.PLANNING) return ActionType.PLANNED;
    if (value === ActionType.ATTENDED) return ActionType.INTERVIEWED;
    return value;
};

export default function AccountTrackerPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [activeStatus, setActiveStatus] = useState<ActionType>(ActionType.APPLIED);

    const loadData = async () => {
        try {
            const data = await actionsApi.list() as { actions: ActionRecord[] };
            setActions(data.actions || []);
        } catch {
            toast.error('Unable to load tracker right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }
        loadData();
    }, [authLoading, user]);

    const handleUpdateStatus = async (opportunityId: string, newStatus: ActionType) => {
        const previousActions = actions;
        setActions((prev) => prev.map((item) =>
            item.opportunity?.id === opportunityId
                ? { ...item, actionType: newStatus }
                : item
        ));

        if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
            enqueueOfflineActionTrack(opportunityId, newStatus, user.id);
            toast.success('Status update queued for sync.');
            return;
        }

        const loadingToast = toast.loading('Updating status...');
        try {
            await actionsApi.track(opportunityId, newStatus);
            await loadData();
            toast.success('Status updated', { id: loadingToast });
        } catch (err: unknown) {
            if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
                enqueueOfflineActionTrack(opportunityId, newStatus, user.id);
                toast.success('Status update queued for sync.', { id: loadingToast });
                return;
            }
            setActions(previousActions);
            const message = err instanceof Error ? err.message : 'Failed to update status';
            toast.error(message, { id: loadingToast });
        }
    };

    const handleRemove = async (opportunityId: string) => {
        if (!confirm('Stop tracking this application?')) return;
        const previousActions = actions;
        setActions((prev) => prev.filter((item) => item.opportunity?.id !== opportunityId));

        if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
            enqueueOfflineActionRemove(opportunityId, user.id);
            toast.success('Removal queued for sync.');
            return;
        }

        const loadingToast = toast.loading('Removing...');
        try {
            await actionsApi.remove(opportunityId);
            await loadData();
            toast.success('Removed from tracker', { id: loadingToast });
        } catch (err: unknown) {
            if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
                enqueueOfflineActionRemove(opportunityId, user.id);
                toast.success('Removal queued for sync.', { id: loadingToast });
                return;
            }
            setActions(previousActions);
            const message = err instanceof Error ? err.message : 'Failed to remove';
            toast.error(message, { id: loadingToast });
        }
    };

    const grouped = useMemo(() => {
        const map: Record<string, ActionRecord[]> = {
            APPLIED: [],
            PLANNED: [],
            INTERVIEWED: [],
            SELECTED: [],
        };

        actions.forEach((item) => {
            const normalized = normalizeStatus(item.actionType);
            if (!map[normalized]) return;
            map[normalized].push({ ...item, actionType: normalized });
        });

        return map;
    }, [actions]);

    const activeItems = grouped[activeStatus] || [];

    if (authLoading || loading) return <LoadingScreen message="Loading tracker..." />;

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-sm">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <ArrowPathRoundedSquareIcon className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in required</h1>
                        <p className="text-sm text-muted-foreground">Log in to your account to view and manage your job application progress.</p>
                    </div>
                    <Link
                        href="/login"
                        className="premium-button h-11 px-8 inline-flex items-center justify-center font-bold uppercase tracking-widest text-xs"
                    >
                        Sign in to FresherFlow
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 border-b border-border/60 pb-4 md:pb-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Application Tracker</h1>
                        <p className="text-base md:text-sm text-muted-foreground font-medium">Track your progress by stage.</p>
                    </div>
                    <Link href="/opportunities" className="self-start text-[11px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1.5">
                        <BriefcaseIcon className="w-4 h-4" />
                        Browse More Opportunities
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-4 md:gap-5">
                    <aside className="flex lg:block gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:space-y-2 lg:overflow-visible lg:pb-0">
                        {STATUS_ORDER.map((status) => {
                            const isActive = activeStatus === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setActiveStatus(status)}
                                    className={cn(
                                        "shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all min-w-[132px] lg:w-full lg:min-w-0",
                                        isActive
                                            ? "border-primary/40 bg-primary/10"
                                            : "border-border bg-card hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", STATUS_CONFIG[status].color)}>
                                            {STATUS_CONFIG[status].label}
                                        </span>
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border px-1.5 text-[11px] font-bold text-foreground">
                                            {grouped[status].length}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </aside>

                    <section className="space-y-3 md:space-y-4">
                        <h2 className="text-lg font-bold tracking-tight text-foreground">
                            {STATUS_CONFIG[activeStatus].label}
                            <span className="ml-2 text-muted-foreground font-normal text-sm">({activeItems.length})</span>
                        </h2>

                        {activeItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                                <p className="text-sm text-muted-foreground font-medium italic">No applications in this stage yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeItems.map((item) => {
                                    const opp = item.opportunity;
                                    if (!opp) return null;

                                    return (
                                        <div key={item.id} className="space-y-2">
                                            <JobCard
                                                job={{ ...opp, normalizedRole: opp.title }}
                                                jobId={opp.id}
                                                isSaved={Boolean((opp as Opportunity & { isSaved?: boolean }).isSaved)}
                                                isApplied={true}
                                                onClick={() => router.push(getOpportunityPathFromItem(opp))}
                                                variant="compact"
                                            />
                                            <div className="rounded-xl border border-border bg-card p-2 flex flex-wrap items-center gap-2">
                                                {STATUS_ORDER.filter((s) => s !== activeStatus).map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleUpdateStatus(opp.id, s)}
                                                        className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide hover:border-primary/30 hover:text-primary"
                                                    >
                                                        {STATUS_CONFIG[s].label}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => handleRemove(opp.id)}
                                                    className="ml-auto rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-destructive hover:bg-destructive/10"
                                                >
                                                    <TrashIcon className="inline w-3.5 h-3.5 mr-1" />
                                                    Stop
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
