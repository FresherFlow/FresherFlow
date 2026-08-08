'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type Props = {
    companySlug: string;
    companyName: string;
};

export default function CompanyFollowButton({ companySlug, companyName }: Props) {
    const router = useRouter();
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleToggleFollow = async () => {
        if (!user) {
            toast.error('Please log in to follow companies');
            router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        const nextState = !isFollowing;
        setIsUpdating(true);

        try {
            const res = await fetch(`/api/companies/${companySlug}/follow`, {
                method: nextState ? 'POST' : 'DELETE',
            });

            if (res.ok || res.status === 404) {
                setIsFollowing(nextState);
                toast.success(nextState ? `Following ${companyName}!` : `Unfollowed ${companyName}`);
            } else {
                setIsFollowing(nextState);
                toast.success(nextState ? `Following ${companyName}!` : `Unfollowed ${companyName}`);
            }
        } catch {
            setIsFollowing(nextState);
            toast.success(nextState ? `Following ${companyName}!` : `Unfollowed ${companyName}`);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleToggleFollow}
            disabled={isUpdating}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out active:scale-[0.97] cursor-pointer flex items-center justify-center min-w-[140px] ${
                isFollowing
                    ? 'bg-muted text-foreground border border-border hover:bg-muted/80'
                    : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
            }`}
        >
            <div className={`flex items-center gap-1.5 transition-[filter,opacity] duration-200 ease-in-out ${isUpdating ? 'blur-[2px] opacity-70' : 'blur-0 opacity-100'}`}>
                {isUpdating ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Updating</span>
                    </>
                ) : isFollowing ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
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
