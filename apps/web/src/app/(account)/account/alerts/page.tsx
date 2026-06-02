import { redirect } from 'next/navigation';

export default function FrozenAccountRoute() {
  redirect('/app');
}

// /* WEB PIVOT: old account implementation preserved below for later restoration.
// 'use client';
// 
// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { useAuth } from '@/features/auth';
// import { alertsApi } from '@/shared/api/client';
// import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// import { Loader2 } from 'lucide-react';
// import { toast } from 'sonner';
// 
// type AlertPreference = {
//     enabled: boolean;
//     emailEnabled: boolean;
//     dailyDigest: boolean;
//     closingSoon: boolean;
//     minRelevanceScore: number;
//     preferredHour: number;
//     timezone: string;
// };
// 
// const DEFAULT_PREFS: AlertPreference = {
//     enabled: true,
//     emailEnabled: true,
//     dailyDigest: true,
//     closingSoon: true,
//     minRelevanceScore: 45,
//     preferredHour: 8,
//     timezone: 'Asia/Kolkata',
// };
// 
// export default function AccountAlertsPage() {
//     const { user, isLoading } = useAuth();
//     const [prefs, setPrefs] = useState<AlertPreference>(DEFAULT_PREFS);
//     const [loadingPrefs, setLoadingPrefs] = useState(true);
//     const [saving, setSaving] = useState(false);
// 
//     useEffect(() => {
//         if (isLoading || !user) return;
//         const load = async () => {
//             setLoadingPrefs(true);
//             try {
//                 interface AlertResponse { preference: AlertPreference }
//                 const response = await alertsApi.getPreferences() as AlertResponse;
//                 setPrefs({
//                     ...DEFAULT_PREFS,
//                     ...(response.preference || {}),
//                 });
//             } catch {
//                 toast.error('Failed to load alert preferences');
//             } finally {
//                 setLoadingPrefs(false);
//             }
//         };
//         load();
//     }, [user, isLoading]);
// 
//     const update = async (patch: Partial<AlertPreference>) => {
//         setSaving(true);
//         try {
//             interface AlertResponse { preference: AlertPreference }
//             const response = await alertsApi.updatePreferences(patch) as AlertResponse;
//             setPrefs({
//                 ...prefs,
//                 ...(response.preference || patch),
//             });
//             toast.success('Alert preferences updated');
//         } catch {
//             toast.error('Failed to update alert preferences');
//         } finally {
//             setSaving(false);
//         }
//     };
// 
//     if (isLoading || loadingPrefs) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
//             </div>
//         );
//     }
// 
//     if (!user) {
//         return (
//             <div className="min-h-screen flex items-center justify-center p-6">
//                 <div className="text-center space-y-4">
//                     <p className="text-muted-foreground">Sign in to manage alerts.</p>
//                     <Link href="/login" className="premium-button !w-fit px-6">Sign in</Link>
//                 </div>
//             </div>
//         );
//     }
// 
//     return (
//         <div className="min-h-screen bg-background pb-16">
//             <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
//                 <div className="flex items-center gap-3">
//                     <Link href="/account" className="p-2 hover:bg-muted rounded-xl transition-colors">
//                         <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
//                     </Link>
//                     <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alert settings</h1>
//                 </div>
// 
//                 <div className="bg-card border rounded-2xl p-4 md:p-6 space-y-4">
//                     <ToggleRow
//                         label="Enable alerts"
//                         value={prefs.enabled}
//                         disabled={saving}
//                         onChange={(v) => update({ enabled: v })}
//                     />
//                     <ToggleRow
//                         label="Email alerts"
//                         value={prefs.emailEnabled}
//                         disabled={!prefs.enabled || saving}
//                         onChange={(v) => update({ emailEnabled: v })}
//                     />
//                     <ToggleRow
//                         label="Daily digest"
//                         value={prefs.dailyDigest}
//                         disabled={!prefs.enabled || !prefs.emailEnabled || saving}
//                         onChange={(v) => update({ dailyDigest: v })}
//                     />
//                     <ToggleRow
//                         label="Closing soon alerts"
//                         value={prefs.closingSoon}
//                         disabled={!prefs.enabled || !prefs.emailEnabled || saving}
//                         onChange={(v) => update({ closingSoon: v })}
//                     />
// 
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
//                         <label className="space-y-1">
//                             <span className="text-xs font-bold capitalize tracking-widest text-muted-foreground">
//                                 Min relevance score
//                             </span>
//                             <input
//                                 type="number"
//                                 min={0}
//                                 max={100}
//                                 value={prefs.minRelevanceScore}
//                                 onChange={(e) => setPrefs({ ...prefs, minRelevanceScore: Number(e.target.value) })}
//                                 onBlur={() => update({ minRelevanceScore: Math.max(0, Math.min(100, prefs.minRelevanceScore)) })}
//                                 className="w-full h-11 rounded-xl border bg-background px-3 text-sm"
//                                 disabled={saving}
//                             />
//                         </label>
// 
//                         <label className="space-y-1">
//                             <span className="text-xs font-bold capitalize tracking-widest text-muted-foreground">
//                                 Daily digest hour (0-23)
//                             </span>
//                             <input
//                                 type="number"
//                                 min={0}
//                                 max={23}
//                                 value={prefs.preferredHour}
//                                 onChange={(e) => setPrefs({ ...prefs, preferredHour: Number(e.target.value) })}
//                                 onBlur={() => update({ preferredHour: Math.max(0, Math.min(23, prefs.preferredHour)) })}
//                                 className="w-full h-11 rounded-xl border bg-background px-3 text-sm"
//                                 disabled={saving}
//                             />
//                         </label>
//                     </div>
// 
//                     <label className="space-y-1 block pt-1">
//                         <span className="text-xs font-bold capitalize tracking-widest text-muted-foreground">Timezone</span>
//                         <input
//                             type="text"
//                             value={prefs.timezone}
//                             onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
//                             onBlur={() => update({ timezone: prefs.timezone || 'Asia/Kolkata' })}
//                             className="w-full h-11 rounded-xl border bg-background px-3 text-sm"
//                             placeholder="Asia/Kolkata"
//                             disabled={saving}
//                         />
//                     </label>
//                 </div>
//             </main>
//         </div>
//     );
// }
// 
// function ToggleRow({
//     label,
//     value,
//     onChange,
//     disabled,
// }: {
//     label: string;
//     value: boolean;
//     onChange: (v: boolean) => void;
//     disabled?: boolean;
// }) {
//     return (
//         <div className="flex items-center justify-between gap-4">
//             <p className="text-sm font-medium">{label}</p>
//             <button
//                 type="button"
//                 aria-pressed={value}
//                 disabled={disabled}
//                 onClick={() => onChange(!value)}
//                 className={`h-8 w-14 rounded-full border transition-all ${value
//                     ? 'bg-primary border-primary'
//                     : 'bg-muted/80 border-border dark:bg-muted'
//                     } disabled:opacity-50`}
//             >
//                 <span
//                     className={`block h-6 w-6 rounded-full transition-transform ${value
//                         ? 'translate-x-7 bg-primary-foreground'
//                         : 'translate-x-1 bg-card border border-border'
//                         }`}
//                 />
//             </button>
//         </div>
//     );
// }
// 
// */
// 
// 

