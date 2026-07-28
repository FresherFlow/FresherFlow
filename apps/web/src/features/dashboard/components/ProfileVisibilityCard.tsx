'use client';

import { useContext, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { cn } from '@/ui/cn';
import { toast } from 'sonner';
import { GlobeAltIcon, LinkIcon, LockClosedIcon } from '@heroicons/react/24/outline';

type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

const OPTIONS: { value: Visibility; label: string; desc: string; Icon: React.ElementType }[] = [
    {
        value: 'PUBLIC',
        label: 'Public',
        desc: 'Indexed by Google. Anyone can find you.',
        Icon: GlobeAltIcon,
    },
    {
        value: 'UNLISTED',
        label: 'Unlisted',
        desc: 'Only people with your link can view it.',
        Icon: LinkIcon,
    },
    {
        value: 'PRIVATE',
        label: 'Private',
        desc: 'Only you can see your profile.',
        Icon: LockClosedIcon,
    },
];

export function ProfileVisibilityCard() {
    const context = useContext(AuthContext);
    const profile = context?.profile as { visibility?: Visibility | null } | null;
    const refreshUser = context?.refreshUser;

    const [saving, setSaving] = useState(false);
    const current: Visibility = profile?.visibility || 'PUBLIC';

    const handleSelect = async (v: Visibility) => {
        if (v === current || saving) return;
        setSaving(true);
        try {
            await profileApi.updateVisibility(v);
            await refreshUser?.();
            toast.success(`Profile visibility set to ${v.charAt(0) + v.slice(1).toLowerCase()}`);
        } catch {
            toast.error('Failed to update visibility. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-3">
            <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Portfolio Visibility</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Control who can see your public profile page.</p>
            </div>
            <div className="space-y-2">
                {OPTIONS.map(({ value, label, desc, Icon }) => {
                    const isActive = current === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            disabled={saving}
                            onClick={() => handleSelect(value)}
                            className={cn(
                                'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                                isActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border/40 hover:border-border hover:bg-muted/40',
                                saving && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                            <div>
                                <p className={cn('text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{label}</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                            </div>
                            {isActive && (
                                <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wide shrink-0 mt-0.5">Active</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {current === 'PUBLIC' && (
                <p className="text-[11px] text-muted-foreground pt-1">
                    ⚠️ Only profiles with ≥50% completion are indexed by Google.
                </p>
            )}
        </div>
    );
}
