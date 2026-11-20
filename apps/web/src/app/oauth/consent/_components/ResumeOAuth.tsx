'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/Button';
import { setUserTokens, getUserRefreshToken } from '@/lib/api/core';
import { API_URL } from '@/lib/utils/runtimeConfig';

interface ResumeOAuthProps {
    /** The API /oauth/authorize URL to continue to once the session is restored. */
    authorizeUrl: string;
    /** Fallback when the stored session cannot be restored. */
    signInUrl: string;
}

/**
 * The web app keeps the user's session in localStorage; the OAuth authorize
 * endpoint on the API reads its own httpOnly cookies on the API origin. A user
 * who is signed in to the website can therefore still arrive here with the API
 * seeing no session — which previously produced the "session expired" screen
 * and a Sign in again -> /login -> back here loop forever.
 *
 * Before offering that dead end, rotate the token the web app already holds.
 * /api/auth/refresh accepts it via x-refresh-token and writes fresh cookies on
 * the API origin, after which the browser can continue straight to the consent
 * screen. Only if that fails do we fall back to an actual sign-in.
 */
export function ResumeOAuth({ authorizeUrl, signInUrl }: ResumeOAuthProps) {
    const attempted = useRef(false);
    const [restoring, setRestoring] = useState(true);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        const refreshToken = getUserRefreshToken();
        if (!refreshToken || !API_URL || !authorizeUrl) {
            setRestoring(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const response = await fetch(`${API_URL}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        // /api/auth/refresh is behind the CSRF gate; without this
                        // the restore always 403s and forces an interactive login.
                        'X-Requested-From': 'fresherflow-web',
                        'x-refresh-token': refreshToken,
                    },
                });
                if (!response.ok) throw new Error('refresh failed');
                const data = (await response.json()) as {
                    accessToken?: string;
                    refreshToken?: string;
                };
                if (!data.accessToken || !data.refreshToken) throw new Error('refresh returned no tokens');
                setUserTokens(data.accessToken, data.refreshToken);
                if (!cancelled) window.location.replace(authorizeUrl);
            } catch {
                if (!cancelled) setRestoring(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authorizeUrl]);

    if (restoring) {
        return <p className="text-sm text-muted-foreground">Restoring your session…</p>;
    }

    return (
        <Button asChild className="w-full">
            <Link href={signInUrl}>Sign in again</Link>
        </Button>
    );
}
