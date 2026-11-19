'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { promptLoginToast } from '@/lib/utils/toastUtils';

type Props = {
    companySlug: string;
};

/**
 * Follow toggle on /companies/{slug}. Persists through the same Firebase store
 * the followed-companies list reads, so a follow shows up in the user's
 * Following tab instead of only flipping this button's local state.
 */
export default function CompanyFollowButton({ companySlug }: Props) {
    const { user } = useAuth();
    const { followedMap, toggleFollow } = useFirebaseFollowedCompanies(user?.id);
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
            // No success toast. The toaster is `position="top-right"` at 24px,
            // which is exactly where these two header buttons sit, so the toast
            // landed on top of them and swallowed their clicks for its whole
            // 4s lifetime. The button already flips to a green "Following" tick,
            // which is the feedback the toast was duplicating anyway. Errors
            // still toast, because nothing on the button reports a failure.
        } catch {
            toast.error('Failed to update follow status');
        } finally {
            setIsUpdating(false);
        }
    };

    // Compact action geometry shared with the masthead's Careers page link and
    // the job detail page's small actions. Follow is the filled action while
    // the company is not followed; once followed it steps back to a quiet
    // confirmed chip, so the masthead never carries two competing CTAs.
    const baseClass =
        'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-meta font-semibold ff-press motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const actionClass = isFollowing
        ? `${baseClass} border border-border-strong bg-card text-muted-foreground dark:border-transparent dark:bg-surface-sunken`
        : `${baseClass} border border-primary bg-primary text-primary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90`;

    return (
        <button
            type="button"
            onClick={handleToggleFollow}
            // Only an in-flight toggle disables the button; folding the initial
            // Firebase load into `disabled` left it visibly faded on load.
            disabled={isUpdating}
            aria-pressed={isFollowing}
            className={actionClass}
        >
            {isUpdating ? (
                <>
                    <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    <span>Updating</span>
                </>
            ) : isFollowing ? (
                <>
                    <CheckIcon className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                    <span>Following</span>
                </>
            ) : (
                <>
                    <PlusIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>Follow</span>
                </>
            )}
        </button>
    );
}
