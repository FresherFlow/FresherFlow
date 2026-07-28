'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { cn } from '@/ui/cn';
import toast from 'react-hot-toast';
import {
    GlobeAltIcon,
    LinkIcon,
    LockClosedIcon,
    CheckIcon,
} from '@heroicons/react/24/outline';

type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; desc: string; Icon: React.ElementType }[] = [
    {
        value: 'PUBLIC',
        label: 'Public',
        desc: 'Indexed by Google. Anyone can search and view your portfolio.',
        Icon: GlobeAltIcon,
    },
    {
        value: 'UNLISTED',
        label: 'Unlisted',
        desc: 'Only people with your direct link can view it.',
        Icon: LinkIcon,
    },
    {
        value: 'PRIVATE',
        label: 'Private',
        desc: 'Hidden from everyone. Only you can view your profile.',
        Icon: LockClosedIcon,
    },
];

export function VisibilitySettingsCard() {
    const { profile, refreshUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const current: Visibility = profile?.visibility || 'PUBLIC';

    const handleSelect = async (val: Visibility) => {
        if (val === current || saving) return;
        setSaving(true);
        try {
            await profileApi.updateVisibility(val);
            await refreshUser();
            toast.success(`Profile set to ${val.charAt(0) + val.slice(1).toLowerCase()}`);
        } catch {
            toast.error('Failed to update visibility');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-3">
            <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Portfolio Visibility
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Control who can find and view your public profile.
                </p>
            </div>

            <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(({ value, label, desc, Icon }) => {
                    const isActive = current === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            disabled={saving}
                            onClick={() => handleSelect(value)}
                            className={cn(
                                'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                                isActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border/40 hover:border-border hover:bg-muted/30',
                                saving && 'opacity-60 cursor-not-allowed'
                            )}
                        >
                            <Icon
                                className={cn(
                                    'w-4 h-4 mt-0.5 shrink-0',
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                    <p className={cn('text-xs font-bold', isActive ? 'text-primary' : 'text-foreground')}>
                                        {label}
                                    </p>
                                    {isActive && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                                            <CheckIcon className="w-3 h-3" /> Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {current === 'PUBLIC' && (
                <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/30">
                    ℹ️ Profiles below 50% completion are not indexed by Google.
                </p>
            )}
        </div>
    );
}
