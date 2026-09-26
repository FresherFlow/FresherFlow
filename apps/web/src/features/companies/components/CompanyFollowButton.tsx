'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { promptLoginToast } from '@/lib/utils/toastUtils';

type Props = {
    companySlug: string;
    companyName: string;
};

/**
 * Follow toggle on /companies/{slug}. Persists through the same Firebase store
 * the followed-companies list reads, so a follow shows up in the user's
 * Following tab instead of only flipping this button's local state.
 */
export default function CompanyFollowButton({ companySlug, companyName }: Props) {
    const { user } = useAuth();
    const { followedMap, loading, toggleFollow } = useFirebaseFollowedCompanies(user?.id);
    const [isUpdating, setIsUpdating] = useState(false);

    const isFollowing = !!followedMap[companySlug];

    const handleToggleFollow = async () => {
        if (!user) {
            promptLoginToast('Sign in to follow companies');
            return;
        }

        setIsUpdating(true);
        try {
            await toggleFollow(companySlug);
            toast.success(isFollowing ? `Unfollowed ${companyName}` : `Following ${companyName}!`);
        } catch {
            toast.error('Failed to update follow status');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleToggleFollow}
            disabled={isUpdating || loading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ease-out active:scale-95 cursor-pointer flex items-center justify-center min-w-35 ${
                isFollowing
                    ? 'bg-muted text-foreground border border-border hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
            }`}
        >
            <div className={`flex items-center gap-1.5 transition-all duration-200 ease-in-out ${isUpdating ? 'blur-sm opacity-70' : 'blur-none opacity-100'}`}>
                {isUpdating ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Updating</span>
                    </>
                ) : isFollowing ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-success" />
                        <span>Following</span>
                    </>
                ) : (
                    <>
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Follow Company</span>
                    </>
                )}
            </div>
        </button>
    );
}
