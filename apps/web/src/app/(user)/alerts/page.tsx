'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UsernameGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';
import { database } from '@/lib/api/firebase';
import { ref, get, update as updateRtdb } from 'firebase/database';

type AlertPreference = {
    privateJobsEnabled: boolean;
    govtJobsEnabled: boolean;
    closingSoonEnabled: boolean;
    minRelevanceScore: number;
    batchYears: number[];
    workModes: string[];
    jobTypes: string[];
    skills: string[];
    locations: string[];
};

const DEFAULT_PREFS: AlertPreference = {
    privateJobsEnabled: true,
    govtJobsEnabled: false,
    closingSoonEnabled: true,
    minRelevanceScore: 45,
    batchYears: [],
    workModes: [],
    jobTypes: [],
    skills: [],
    locations: [],
};

const BATCH_OPTIONS = [2023, 2024, 2025, 2026, 2027, 2028];

const WORK_MODE_OPTIONS = [
    { label: 'Remote', value: 'Remote' },
    { label: 'Hybrid', value: 'Hybrid' },
    { label: 'On-site', value: 'On-site' },
];

const JOB_TYPE_OPTIONS = [
    { label: 'Jobs', value: 'Jobs' },
    { label: 'Internships', value: 'Internships' },
    { label: 'Walk-ins', value: 'Walk-ins' },
    { label: 'Government', value: 'Government' },
];

const LOCATION_OPTIONS = [
    'Bengaluru',
    'Hyderabad',
    'Pune',
    'Delhi NCR',
    'Chennai',
    'Mumbai',
    'Remote',
];

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
    await updateRtdb(ref(database, `/users/${uid}/alertPreferences`), {
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

function SkillTagInput({
    skills,
    onSkillsChange,
    disabled,
}: {
    skills: string[];
    onSkillsChange: (skills: string[]) => void;
    disabled?: boolean;
}) {
    const [inputValue, setInputValue] = useState('');

    const addSkill = (val: string) => {
        const cleaned = val.trim();
        if (!cleaned) return;
        const newSkills = cleaned
            .split(',')
            .map(s => s.trim())
            .filter(s => s && !skills.some(existing => existing.toLowerCase() === s.toLowerCase()));
        if (newSkills.length > 0) {
            onSkillsChange([...skills, ...newSkills]);
        }
        setInputValue('');
    };

    const removeSkill = (index: number) => {
        onSkillsChange(skills.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addSkill(inputValue);
        }
    };

    return (
        <div className="space-y-2">
            {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, index) => (
                        <span
                            key={`${skill}-${index}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                        >
                            {skill}
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => removeSkill(index)}
                                className="hover:text-primary/70 transition-colors focus:outline-none"
                                aria-label={`Remove ${skill}`}
                            >
                                <XMarkIcon className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <input
                type="text"
                value={inputValue}
                disabled={disabled}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addSkill(inputValue)}
                placeholder="Type a skill and press Enter or comma (e.g. React, Python)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/60 focus:border-primary focus:outline-none transition-colors"
            />
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
            if (rtdbPrefs) {
                setPrefs({
                    ...DEFAULT_PREFS,
                    ...rtdbPrefs,
                    batchYears: rtdbPrefs.batchYears || [],
                    workModes: rtdbPrefs.workModes || [],
                    jobTypes: rtdbPrefs.jobTypes || [],
                    skills: rtdbPrefs.skills || [],
                    locations: rtdbPrefs.locations || [],
                });
            }
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
                {[1, 2, 3, 4].map(i => (
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

            {/* Eligibility & Target Filters */}
            <section className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Eligibility & Target Filters</p>
                <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-5">
                    {/* Batch Years */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Target Passout Batches</p>
                            <p className="text-xs text-muted-foreground">Receive alerts matching your graduation year</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {BATCH_OPTIONS.map((year) => {
                                const isSelected = (prefs.batchYears || []).includes(year);
                                return (
                                    <button
                                        key={year}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => {
                                            const current = prefs.batchYears || [];
                                            const next = isSelected
                                                ? current.filter(y => y !== year)
                                                : [...current, year];
                                            update({ batchYears: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ease-out active:scale-[0.97] ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Work Modes */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Preferred Work Modes</p>
                            <p className="text-xs text-muted-foreground">Filter by workplace location model</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {WORK_MODE_OPTIONS.map((mode) => {
                                const isSelected = (prefs.workModes || []).includes(mode.value);
                                return (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => {
                                            const current = prefs.workModes || [];
                                            const next = isSelected
                                                ? current.filter(m => m !== mode.value)
                                                : [...current, mode.value];
                                            update({ workModes: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ease-out active:scale-[0.97] ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground'
                                        }`}
                                    >
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Job Types */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Opportunity Types</p>
                            <p className="text-xs text-muted-foreground">Select the types of postings you want to track</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {JOB_TYPE_OPTIONS.map((jt) => {
                                const isSelected = (prefs.jobTypes || []).includes(jt.value);
                                return (
                                    <button
                                        key={jt.value}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => {
                                            const current = prefs.jobTypes || [];
                                            const next = isSelected
                                                ? current.filter(t => t !== jt.value)
                                                : [...current, jt.value];
                                            update({ jobTypes: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ease-out active:scale-[0.97] ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground'
                                        }`}
                                    >
                                        {jt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Target Skills & Tech Stack</p>
                            <p className="text-xs text-muted-foreground">Get alerted for postings requiring specific skills</p>
                        </div>
                        <SkillTagInput
                            skills={prefs.skills || []}
                            disabled={saving}
                            onSkillsChange={(nextSkills) => update({ skills: nextSkills })}
                        />
                    </div>

                    {/* Locations */}
                    <div className="space-y-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Preferred Job Locations</p>
                            <p className="text-xs text-muted-foreground">Select target cities or remote</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {LOCATION_OPTIONS.map((loc) => {
                                const isSelected = (prefs.locations || []).includes(loc);
                                return (
                                    <button
                                        key={loc}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => {
                                            const current = prefs.locations || [];
                                            const next = isSelected
                                                ? current.filter(l => l !== loc)
                                                : [...current, loc];
                                            update({ locations: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ease-out active:scale-[0.97] ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground'
                                        }`}
                                    >
                                        {loc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
        <UsernameGate>
            <AlertSettingsContent />
        </UsernameGate>
    );
}
