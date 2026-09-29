'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { isSafeInternalRedirect } from '@/lib/config/paths';

/**
 * Tab-scoped hand-off for the post-auth destination.
 *
 * The claim itself lives in the shared login shell, which hands off to
 * /onboarding without forwarding `?redirect=` — so the destination is parked
 * here first and /onboarding picks it up when its own query string has none.
 * Keep the key in sync with that page.
 */
export const REDIRECT_HANDOFF_KEY = 'ff_onboarding_redirect';

export function RedirectHandoff() {
    const redirectParam = useSearchParams().get('redirect');
    useEffect(() => {
        // Same rule as the login shell: the param is attacker-controllable, so
        // only a safe internal path is ever stored.
        if (!isSafeInternalRedirect(redirectParam)) return;
        try {
            sessionStorage.setItem(REDIRECT_HANDOFF_KEY, (redirectParam as string).trim());
        } catch {}
    }, [redirectParam]);
    return null;
}
