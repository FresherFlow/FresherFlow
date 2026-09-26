'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authApi } from '@/lib/api/auth';

/** Any of these permissions admits the holder to the moderator area. */
export const MODERATION_PERMISSIONS = [
    'opportunity.review',
    'report.resolve',
    'community.moderate',
    'resource.moderate',
    'user.manage',
] as const;

/**
 * Moderator-area access for the normal application login: the signed-in user
 * is allowed when the API reports at least one moderation permission.
 * Server-side routes re-check every call — this is navigation gating only.
 */
export function useModerationAuth() {
    const { user, isLoading: authLoading } = useAuth();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setPermissions([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        authApi
            .myPermissions()
            .then((res) => {
                if (!cancelled) setPermissions(res.permissions || []);
            })
            .catch(() => {
                if (!cancelled) setPermissions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user, authLoading]);

    const allowed = Boolean(user) && permissions.some((p) => (MODERATION_PERMISSIONS as readonly string[]).includes(p));
    return { user, permissions, allowed, loading: authLoading || loading };
}
