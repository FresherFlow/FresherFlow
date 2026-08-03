'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AuthGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';
import { database } from '@/lib/api/firebase';
import { ref, get, update } from 'firebase/database';

type AlertPreference = {
    privateJobsEnabled: boolean;
    govtJobsEnabled: boolean;
    closingSoonEnabled: boolean;
    minRelevanceScore: number;
};

const DEFAULT_PREFS: AlertPreference = {
    privateJobsEnabled: true,
    govtJobsEnabled: false,
    closingSoonEnabled: true,
    minRelevanceScore: 45,
};

async function readRtdbAlertPrefs(uid: string): Promise<AlertPreference | null> {
    try {
        const snapshot = await get(ref(database, `/users/${uid}/alertPreferences`));
        const val = snapshot.val();
        return val ? (val as AlertPreference) : null;
    } catch {
        return null;
    }
}

async function writeRtdbAlertPrefs(uid: string, prefs: AlertPreference) {
    await update(ref(database, `/users/${uid}/alertPreferences`), {
        ...prefs,
        updatedAt: Date.now(),
    });
}

function ToggleRow({
    label,
    description,
    value,
    onChange,
    disabled,
}: {
    label: string;
    description?: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                aria-pressed={value}
                disabled={disabled}
                onClick={() => onChange(!value)}
                className={`shrink-0 h-7 w-12 rounded-full border transition-all relative ${value
                    ? 'bg-primary border-primary'
                    : 'bg-muted/80 border-border'
                    } disabled:opacity-50`}
            >
                <span
                    className={`block h-5 w-5 rounded-full transition-transform absolute top-1 ${value
                        ? 'translate-x-[22px] bg-primary-foreground'
                        : 'translate-x-1 bg-card border border-border'
                        }`}
                />
            </button>
        </div>
    );
}

function AlertSettingsContent() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [prefs, setPrefs] = useState<AlertPreference>(DEFAULT_PREFS);
    const [loadingPrefs, setLoadingPrefs] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isLoading || !user) return;
        readRtdbAlertPrefs(user.id).then(rtdbPrefs => {
            if (rtdbPrefs) setPrefs({ ...DEFAULT_PREFS, ...rtdbPrefs });
        }).catch(() => {}).finally(() => setLoadingPrefs(false));
    }, [user, isLoading]);

    const update = async (patch: Partial<AlertPreference>) => {
        if (!user) return;
        const next = { ...prefs, ...patch };
        setPrefs(next);
        setSaving(true);
        try {
            await writeRtdbAlertPrefs(user.id, next);
            toast.success('Alert settings saved');
        } catch {
            toast.error('Failed to save alert settings');
            setPrefs(prefs); // rollback
        } finally {
            setSaving(false);
        }
    };

    if (isLoading || loadingPrefs) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    const anyChannelEnabled = prefs.privateJobsEnabled || prefs.govtJobsEnabled;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8 space-y-5 md:space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer" aria-label="Go back">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Alert Settings</h1>
                        <p className="text-xs text-muted-foreground">Control which job alerts you receive</p>
                    </div>
                </div>
                <Link
                    href="/notifications"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
                >
                    <span>View notifications</span>
                    <span>&rarr;</span>
                </Link>
            </div>

            {/* Channels */}
            <section className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Channels</p>
                <div className="bg-card border border-border/60 rounded-2xl px-4 divide-y divide-border/40">
                    <ToggleRow
                        label="Private Jobs"
                        description="Tech, corporate, off-campus opportunities"
                        value={prefs.privateJobsEnabled}
                        disabled={saving}
                        onChange={(v) => update({ privateJobsEnabled: v })}
                    />
                    <ToggleRow
                        label="Government Jobs"
                        description="SSC, UPSC, PSU, banking, defense"
                        value={prefs.govtJobsEnabled}
                        disabled={saving}
                        onChange={(v) => update({ govtJobsEnabled: v })}
                    />
                </div>
            </section>

            {/* Preferences */}
            <section className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Preferences</p>
                <div className="bg-card border border-border/60 rounded-2xl px-4 divide-y divide-border/40">
                    <ToggleRow
                        label="Closing Soon Alerts"
                        description="Get notified when deadlines are near"
                        value={prefs.closingSoonEnabled}
                        disabled={saving || !anyChannelEnabled}
                        onChange={(v) => update({ closingSoonEnabled: v })}
                    />
                </div>
            </section>

            {/* Min relevance score */}
            <section className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Advanced</p>
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Min Relevance Score</p>
                        <p className="text-xs text-muted-foreground">Only notify when match score exceeds this (0–100)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={prefs.minRelevanceScore}
                            onChange={(e) => setPrefs({ ...prefs, minRelevanceScore: Number(e.target.value) })}
                            onMouseUp={() => update({ minRelevanceScore: prefs.minRelevanceScore })}
                            onTouchEnd={() => update({ minRelevanceScore: prefs.minRelevanceScore })}
                            className="flex-1 accent-primary"
                            disabled={saving}
                        />
                        <span className="text-sm font-bold text-foreground w-8 text-right tabular-nums">
                            {prefs.minRelevanceScore}
                        </span>
                    </div>
                </div>
            </section>

            <p className="text-[11px] text-muted-foreground text-center pb-4">
                Alert preferences sync instantly to your account across devices.
            </p>
        </div>
    );
}

export default function AccountAlertsPage() {
    return (
        <AuthGate>
            <AlertSettingsContent />
        </AuthGate>
    );
}
