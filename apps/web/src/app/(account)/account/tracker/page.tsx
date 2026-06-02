import { redirect } from 'next/navigation';

export default function FrozenAccountRoute() {
  redirect('/app');
}

// /* WEB PIVOT: old account implementation preserved below for later restoration.
// 'use client';
// 
// import { useEffect, useMemo, useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/contexts/AuthContext';
// import { actionsApi } from '@/lib/api/client';
// import { ActionType } from '@fresherflow/types';
// import type { Opportunity } from '@fresherflow/types';
// import LoadingScreen from '@/components/ui/LoadingScreen';
// import toast from 'react-hot-toast';
// import {
//     BriefcaseIcon,
//     TrashIcon,
//     ArrowPathRoundedSquareIcon
// } from '@heroicons/react/24/outline';
// import { cn } from '@/lib/utils';
// import { getOpportunityPathFromItem } from '@/lib/opportunityPath';
// import { enqueueOfflineActionRemove, enqueueOfflineActionTrack } from '@/lib/offline/actionQueue';
// import JobCard from '@/features/jobs/components/JobCard';
// 
// type ActionRecord = {
//     id: string;
//     actionType: ActionType;
//     createdAt: string | Date;
//     opportunity?: Opportunity;
// };
// 
// const STATUS_ORDER: ActionType[] = [
//     ActionType.APPLIED,
//     ActionType.PLANNED,
//     ActionType.INTERVIEWED,
//     ActionType.SELECTED,
// ];
// 
// const STATUS_LABEL: Record<string, string> = {
//     APPLIED: 'Applied',
//     PLANNED: 'Planned',
//     INTERVIEWED: 'Interviewed',
//     SELECTED: 'Selected',
//     PLANNING: 'Planned',
//     ATTENDED: 'Interviewed',
// };
// 
// const normalizeStatus = (value: ActionType): ActionType => {
//     if (value === ActionType.PLANNING) return ActionType.PLANNED;
//     if (value === ActionType.ATTENDED) return ActionType.INTERVIEWED;
//     return value;
// };
// 
// export default function AccountTrackerPage() {
//     const { user, isLoading: authLoading } = useAuth();
//     const router = useRouter();
//     const [loading, setLoading] = useState(true);
//     const [actions, setActions] = useState<ActionRecord[]>([]);
//     const [activeStatus, setActiveStatus] = useState<ActionType>(ActionType.APPLIED);
// 
//     const loadData = async () => {
//         try {
//             const data = await actionsApi.list() as { actions: ActionRecord[] };
//             setActions(data.actions || []);
//         } catch {
//             toast.error('Unable to load tracker right now.');
//         } finally {
//             setLoading(false);
//         }
//     };
// 
//     useEffect(() => {
//         if (authLoading) return;
//         if (!user) { setLoading(false); return; }
//         loadData();
//     }, [authLoading, user]);
// 
//     const handleUpdateStatus = async (opportunityId: string, newStatus: ActionType) => {
//         const previousActions = actions;
//         setActions((prev) => prev.map((item) =>
//             item.opportunity?.id === opportunityId ? { ...item, actionType: newStatus } : item
//         ));
//         if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
//             enqueueOfflineActionTrack(opportunityId, newStatus, user.id);
//             toast.success('Status update queued for sync.');
//             return;
//         }
//         const t = toast.loading('Updating status...');
//         try {
//             await actionsApi.track(opportunityId, newStatus);
//             await loadData();
//             toast.success('Status updated', { id: t });
//         } catch (err: unknown) {
//             if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
//                 enqueueOfflineActionTrack(opportunityId, newStatus, user.id);
//                 toast.success('Status update queued for sync.', { id: t });
//                 return;
//             }
//             setActions(previousActions);
//             toast.error(err instanceof Error ? err.message : 'Failed to update status', { id: t });
//         }
//     };
// 
//     const handleRemove = async (opportunityId: string) => {
//         if (!confirm('Stop tracking this application?')) return;
//         const previousActions = actions;
//         setActions((prev) => prev.filter((item) => item.opportunity?.id !== opportunityId));
//         if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
//             enqueueOfflineActionRemove(opportunityId, user.id);
//             toast.success('Removal queued for sync.');
//             return;
//         }
//         const t = toast.loading('Removing...');
//         try {
//             await actionsApi.remove(opportunityId);
//             await loadData();
//             toast.success('Removed from tracker', { id: t });
//         } catch (err: unknown) {
//             if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
//                 enqueueOfflineActionRemove(opportunityId, user.id);
//                 toast.success('Removal queued for sync.', { id: t });
//                 return;
//             }
//             setActions(previousActions);
//             toast.error(err instanceof Error ? err.message : 'Failed to remove', { id: t });
//         }
//     };
// 
//     const grouped = useMemo(() => {
//         const map: Record<string, ActionRecord[]> = {
//             APPLIED: [], PLANNED: [], INTERVIEWED: [], SELECTED: [],
//         };
//         actions.forEach((item) => {
//             const normalized = normalizeStatus(item.actionType);
//             if (!map[normalized]) return;
//             map[normalized].push({ ...item, actionType: normalized });
//         });
//         return map;
//     }, [actions]);
// 
//     const activeItems = grouped[activeStatus] || [];
// 
//     if (authLoading || loading) return <LoadingScreen message="Loading tracker..." />;
// 
//     if (!user) {
//         return (
//             <div className="min-h-screen bg-background flex items-center justify-center px-6">
//                 <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-sm">
//                     <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
//                         <ArrowPathRoundedSquareIcon className="w-8 h-8 text-muted-foreground/40" />
//                     </div>
//                     <div className="space-y-2">
//                         <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in required</h1>
//                         <p className="text-sm text-muted-foreground">Log in to view your application progress.</p>
//                     </div>
//                     <Link href="/login" className="premium-button h-11 px-8 inline-flex items-center justify-center font-bold capitalize tracking-widest text-xs">
//                         Sign in to FresherFlow
//                     </Link>
//                 </div>
//             </div>
//         );
//     }
// 
//     return (
//         <div className="min-h-screen bg-background pb-20">
//             <main className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
// 
//                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4 pb-4 md:pb-6">
//                     <h1 className="text-lg font-bold tracking-tight text-foreground">Application Tracker</h1>
//                     <Link href="/opportunities" className="self-start text-[11px] font-bold capitalize tracking-widest text-primary hover:underline flex items-center gap-1.5">
//                         <BriefcaseIcon className="w-4 h-4" />
//                         Browse More Opportunities
//                     </Link>
//                 </div>
// 
//                 <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
//                     {STATUS_ORDER.map((status) => {
//                         const isActive = activeStatus === status;
//                         return (
//                             <button
//                                 key={status}
//                                 onClick={() => setActiveStatus(status)}
//                                 className={cn(
//                                     'shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2 transition-all',
//                                     isActive
//                                         ? 'border-border bg-card text-foreground'
//                                         : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground'
//                                 )}
//                             >
//                                 <span className="text-[11px] font-bold capitalize tracking-widest whitespace-nowrap">
//                                     {STATUS_LABEL[status]}
//                                 </span>
//                                 <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-border px-1.5 text-[11px] font-bold text-muted-foreground tabular-nums">
//                                     {grouped[status].length}
//                                 </span>
//                             </button>
//                         );
//                     })}
//                 </div>
// 
//                 <section className="space-y-3 md:space-y-4">
//                     <h2 className="text-sm font-bold tracking-tight text-foreground">
//                         {STATUS_LABEL[activeStatus]}
//                         <span className="ml-2 text-muted-foreground font-normal text-sm">({activeItems.length})</span>
//                     </h2>
// 
//                     {activeItems.length === 0 ? (
//                         <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
//                             <p className="text-sm text-muted-foreground font-medium italic">No applications in this stage yet.</p>
//                         </div>
//                     ) : (
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {activeItems.map((item) => {
//                                 const opp = item.opportunity;
//                                 if (!opp) return null;
//                                 return (
//                                     <div key={item.id} className="space-y-2">
//                                         <JobCard
//                                             job={{ ...opp, normalizedRole: opp.title }}
//                                             jobId={opp.id}
//                                             isSaved={Boolean((opp as Opportunity & { isSaved?: boolean }).isSaved)}
//                                             isApplied={true}
//                                             onClick={() => router.push(getOpportunityPathFromItem(opp))}
//                                             variant="compact"
//                                         />
//                                         <div className="rounded-xl border border-border bg-card p-2 flex flex-wrap items-center gap-2">
//                                             {STATUS_ORDER.filter((s) => s !== activeStatus).map((s) => (
//                                                 <button
//                                                     key={s}
//                                                     onClick={() => handleUpdateStatus(opp.id, s)}
//                                                     className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold capitalize tracking-wide text-muted-foreground hover:text-foreground"
//                                                 >
//                                                     {STATUS_LABEL[s]}
//                                                 </button>
//                                             ))}
//                                             <button
//                                                 onClick={() => handleRemove(opp.id)}
//                                                 className="ml-auto rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[10px] font-bold capitalize tracking-wide text-destructive hover:bg-destructive/10"
//                                             >
//                                                 <TrashIcon className="inline w-3.5 h-3.5 mr-1" />
//                                                 Stop
//                                             </button>
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </section>
//             </main>
//         </div>
//     );
// }
// 
// */
// 
// 

