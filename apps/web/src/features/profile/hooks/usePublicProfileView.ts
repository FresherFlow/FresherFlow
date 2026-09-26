'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/core';
import { authApi } from '@/lib/api/auth';

const SESSION_KEY_PREFIX = 'ff_view_session_';

function createViewerSession(): string {
    // A per-viewer session id, not a credential. Web Crypto is the client-side source the
    // repo standardises on, so this does not reach for Math.random.
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(performance.now() * 1000)}`;
}

/**
 * Counts one visit per browser session and reports whether the viewer owns the page.
 *
 * `enabled: false` skips the ping entirely — the owner previewing their own page from the
 * editor must not add to their own view count, which is a number recruiters never see but the
 * owner does.
 */
export function usePublicProfileView({
    username,
    userId,
    enabled = true,
}: {
    username: string | null;
    userId: string;
    enabled?: boolean;
}) {
    const [views, setViews] = useState<number | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        if (!enabled || !username) return;
        let cancelled = false;

        const key = `${SESSION_KEY_PREFIX}${username}`;
        let viewerSession = '';
        try {
            viewerSession = sessionStorage.getItem(key) || '';
            if (!viewerSession) {
                viewerSession = createViewerSession();
                sessionStorage.setItem(key, viewerSession);
            }
        } catch {
            // Storage is unavailable (e.g. private mode): fall back to a
            // per-mount id that is never persisted, so each fresh page load
            // still counts exactly once instead of collapsing all
            // no-storage viewers into a single deduped session.
            viewerSession = `no-storage:${createViewerSession()}`;
        }

        apiClient<{ success: boolean; views: number; countedNow: boolean }>(
            `/api/public/profiles/${encodeURIComponent(username)}/view`,
            { method: 'POST', body: JSON.stringify({ viewerSession }) },
        )
            .then((data) => {
                if (cancelled || !data) return;
                // The counter is owner-only, so it takes a second call to know who is looking.
                authApi
                    .me()
                    .then((me) => {
                        const mine = (me as { user?: { id?: string } })?.user?.id === userId;
                        setIsOwner(mine);
                        if (mine) setViews(data.views);
                    })
                    .catch(() => {
                        /* a visitor — no counter to show */
                    });
            })
            .catch(() => {
                /* view counting must never break the page */
            });

        return () => {
            cancelled = true;
        };
    }, [username, userId, enabled]);

    return { views, isOwner };
}
