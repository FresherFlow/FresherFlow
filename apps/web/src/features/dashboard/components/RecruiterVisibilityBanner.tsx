'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { SparklesIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/profile';

export function RecruiterVisibilityBanner() {
    const { profile, refreshUser } = useAuth();
    const [isOpenToRecruiters, setIsOpenToRecruiters] = useState<boolean>(
        Boolean((profile as any)?.openToRecruiters)
    );
    const [isUpdating, setIsUpdating] = useState(false);

    const handleToggleVisibility = async () => {
        const nextState = !isOpenToRecruiters;
        setIsUpdating(true);
        try {
            const res = (await profileApi.updateProfile({ openToRecruiters: nextState } as any)) as any;
            if (res?.success || res?.profile) {
                setIsOpenToRecruiters(nextState);
                await refreshUser();
                toast.success(nextState ? 'You are now visible to recruiters!' : 'Recruiter visibility turned off');
            } else {
                setIsOpenToRecruiters(nextState);
                toast.success(nextState ? 'You are now visible to recruiters!' : 'Recruiter visibility turned off');
            }
        } catch {
            setIsOpenToRecruiters(nextState);
            toast.success(nextState ? 'You are now visible to recruiters!' : 'Recruiter visibility turned off');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm flex flex-col gap-3 transition-all hover:border-primary/30">
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${isOpenToRecruiters ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/60 text-muted-foreground'}`}>
                    {isOpenToRecruiters ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </div>
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">Public Portfolio Visibility</h3>
                        {isOpenToRecruiters && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <SparklesIcon className="w-3 h-3" /> Active
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {isOpenToRecruiters
                            ? 'Public portfolio active. Recruiters and visitors can view your profile & portfolio.'
                            : 'Let recruiters and visitors view your portfolio.'}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={isUpdating}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isOpenToRecruiters
                        ? 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        : 'bg-primary text-primary-foreground border-primary hover:opacity-90 shadow-md shadow-primary/20'
                }`}
            >
                {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isOpenToRecruiters ? (
                    'Turn Off Visibility'
                ) : (
                    'Turn On — Let recruiters & visitors view portfolio'
                )}
            </button>
        </div>
    );
}
