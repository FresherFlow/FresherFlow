'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/client';
import { cn } from '@/ui/cn';
import { GlobeAltIcon, LinkIcon, LockClosedIcon } from '@heroicons/react/24/outline';

type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; Icon: React.ElementType }[] = [
    { value: 'PUBLIC', label: 'Public', Icon: GlobeAltIcon },
    { value: 'UNLISTED', label: 'Unlisted', Icon: LinkIcon },
    { value: 'PRIVATE', label: 'Private', Icon: LockClosedIcon },
];

const VISIBILITY_HINT: Record<Visibility, string> = {
    PUBLIC: 'Indexed by Google — anyone can find it.',
    UNLISTED: 'Only people with your direct link can open it.',
    PRIVATE: 'Hidden from everyone except you.',
};

/**
 * The one visibility control.
 *
 * Portfolio visibility and recruiter availability used to live in three
 * separate components with three different defaults (`PUBLIC`, `PUBLIC`,
 * `openToRecruiters`). This owns both settings, in one place, and reads its
 * state from the same cached auth profile the rest of /account reads — so
 * nothing here can show a different answer than the page it sits on.
 */
export function VisibilityControl() {
    const { profile, updateProfileState, refreshProfile } = useAuth();
    const [saving, setSaving] = useState<Visibility | 'recruiters' | null>(null);

    const visibility: Visibility = profile?.visibility ?? 'PRIVATE';
    const openToRecruiters = profile?.openToRecruiters !== false;

    const setVisibility = async (next: Visibility) => {
        if (next === visibility || saving) return;
        setSaving(next);
        try {
            await profileApi.updateVisibility(next);
            updateProfileState({ visibility: next });
            await refreshProfile().catch(() => undefined);
            toast.success(
                next === 'PUBLIC'
                    ? 'Your page is now public.'
                    : next === 'UNLISTED'
                      ? 'Your page is now unlisted — link sharing only.'
                      : 'Your page is now private.',
            );
        } catch (err) {
            toast.error((err as Error).message || 'Could not update visibility. Try again.');
        } finally {
            setSaving(null);
        }
    };

    const setRecruiters = async (next: boolean) => {
        if (next === openToRecruiters || saving) return;
        setSaving('recruiters');
        try {
            await profileApi.updateProfile({ openToRecruiters: next });
            updateProfileState({ openToRecruiters: next });
            await refreshProfile().catch(() => undefined);
            toast.success(next ? 'Recruiters can now send you intros.' : 'Recruiter intros are off.');
        } catch {
            toast.error('Could not update this setting. Try again.');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">Who can see your page</p>
                    <p className="text-xs text-muted-foreground leading-snug">{VISIBILITY_HINT[visibility]}</p>
                </div>
                <div
                    role="radiogroup"
                    aria-label="Portfolio visibility"
                    className="inline-flex shrink-0 rounded-lg border border-border/60 bg-muted/40 p-0.5"
                >
                    {VISIBILITY_OPTIONS.map(({ value, label, Icon }) => {
                        const isActive = visibility === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                disabled={saving !== null}
                                onClick={() => void setVisibility(value)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed',
                                    isActive
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                    saving !== null && 'opacity-60',
                                )}
                            >
                                <Icon className="size-3.5" aria-hidden="true" />
                                {saving === value ? 'Saving…' : label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">Open to recruiters</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                        Show the “request an intro” action on your public page.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={openToRecruiters}
                    disabled={saving !== null}
                    onClick={() => void setRecruiters(!openToRecruiters)}
                    className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed',
                        openToRecruiters
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        saving !== null && 'opacity-60',
                    )}
                >
                    {saving === 'recruiters' ? 'Saving…' : openToRecruiters ? 'On' : 'Off'}
                </button>
            </div>
        </div>
    );
}
