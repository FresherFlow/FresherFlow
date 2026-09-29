'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/error';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    getProfilePageState,
    isProfilePagePublished,
    PROFILE_BOOST_DAYS,
    type ProfilePageState,
} from '@fresherflow/utils';

/**
 * Owns the one write to the public page and its derived status.
 *
 * Called from the profile card, the /account hub row and the dashboard nudge, so there is
 * one implementation of the publish call and one place that decides what state the user is
 * in. The same endpoint does both jobs: the first call publishes (permanent), every later
 * call re-boosts (PROFILE_BOOST_DAYS of recruiter-directory placement).
 */
export function usePublicPageActivation() {
    const { user, profile, refreshProfile } = useAuth();
    const router = useRouter();
    const [isPublishing, setIsPublishing] = useState(false);
    // Local override so the status flips immediately after activation, without
    // waiting for the profile refetch to land.
    const [activatedAt, setActivatedAt] = useState<Date | string | null | undefined>(undefined);

    const publishedAt = activatedAt !== undefined ? activatedAt : (profile?.profilePublishedAt ?? null);
    const state: ProfilePageState = getProfilePageState(publishedAt);
    const username = user?.username ?? null;
    const pagePath = username ? `/u/${username}` : null;

    const activate = useCallback(async (options?: { navigateToPage?: boolean }) => {
        if (isPublishing) return;
        setIsPublishing(true);
        try {
            const wasPublished = isProfilePagePublished(publishedAt);
            const res = (await profileApi.publishProfile()) as { publishedAt?: string } | null;
            setActivatedAt(res?.publishedAt ? new Date(res.publishedAt) : new Date());
            await refreshProfile().catch(() => undefined);
            toast.success(
                wasPublished
                    ? `Boosted again — you're at the top of the recruiter directory for ${PROFILE_BOOST_DAYS} days.`
                    : `Your page is live${username ? ` at fresherflow.in/u/${username}` : ''} — boosted for ${PROFILE_BOOST_DAYS} days.`,
            );
            if (options?.navigateToPage && pagePath) router.push(pagePath);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not activate your page. Try again.'));
        } finally {
            setIsPublishing(false);
        }
    }, [isPublishing, pagePath, publishedAt, refreshProfile, router, username]);

    return { username, pagePath, state, publishedAt, isPublishing, activate };
}
