'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BrandButton } from '@/ui/BrandButton';
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

    return (
        // Same `BrandButton` outline at `size="sm"` as the "Careers page" button
        // beside it, so the two header actions are visually identical and
        // neither reads as the primary one. `selected` is that same outline
        // geometry lit up, so following never changes the button's shape.
        <BrandButton
            onClick={handleToggleFollow}
            // Only an in-flight toggle disables the button. Folding the initial
            // Firebase load into `disabled` left it sitting at
            // `disabled:opacity-50` on load - a visibly faded, mismatched button
            // next to the solid-outline Careers page one.
            disabled={isUpdating}
            variant={isFollowing ? 'selected' : 'outline'}
            size="sm"
            className="shrink-0"
        >
            {/* `gap-2` and a 14px icon to match `BrandButton`'s own icon rhythm,
                so the label sits the same distance from its icon as it does on
                the Careers page button. */}
            <span className={`flex items-center gap-2 transition-all duration-200 ease-in-out ${isUpdating ? 'blur-sm opacity-70' : 'blur-none opacity-100'}`}>
                {isUpdating ? (
                    <>
                        <div className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Updating</span>
                    </>
                ) : isFollowing ? (
                    <>
                        <CheckIcon className="size-3.5 shrink-0 text-success" />
                        <span>Following</span>
                    </>
                ) : (
                    <>
                        <PlusIcon className="size-3.5 shrink-0" />
                        <span>Follow</span>
                    </>
                )}
            </span>
        </BrandButton>
    );
}
