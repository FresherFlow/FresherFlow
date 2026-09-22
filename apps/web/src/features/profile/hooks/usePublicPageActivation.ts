'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    getProfilePageState,
    PROFILE_PAGE_ACTIVE_DAYS,
    type ProfilePageState,
} from '@fresherflow/utils';

/**
 * Owns the "activate my public page" action and its derived status.
 *
 * A page is only reachable for PROFILE_PAGE_ACTIVE_DAYS after activation, so this is
 * called from the profile card and from the dashboard nudge — one implementation of
 * the publish call, one place that decides what state the user is in.
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
            const res = (await profileApi.publishProfile()) as { publishedAt?: string } | null;
            setActivatedAt(res?.publishedAt ? new Date(res.publishedAt) : new Date());
            await refreshProfile().catch(() => undefined);
            toast.success(`Your page is live for the next ${PROFILE_PAGE_ACTIVE_DAYS} days.`);
            if (options?.navigateToPage && pagePath) router.push(pagePath);
        } catch (err) {
            toast.error((err as Error).message || 'Could not activate your page. Try again.');
        } finally {
            setIsPublishing(false);
        }
    }, [isPublishing, pagePath, refreshProfile, router]);

    return { username, pagePath, state, publishedAt, isPublishing, activate };
}
