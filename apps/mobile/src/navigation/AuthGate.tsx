/**
 * AuthGate.tsx
 *
 * THE SINGLE SOURCE OF TRUTH for all auth-state routing decisions.
 *
 * Rules (in order of priority):
 *  1. LOADING                              → show nothing (resolving Firebase state)
 *  2. AUTHENTICATED, no username yet       → show ChooseUsername (user can skip)
 *  3. ANONYMOUS guest OR has username      → show the full app
 *
 * The app is DISCOVERY-FIRST. Anonymous/guest users browse freely.
 * Auth is triggered contextually when a user attempts a gated action.
 *
 * DO NOT put routing decisions anywhere else.
 * Screens should never navigate based on auth state themselves.
 */

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthGateProps {
    /** Rendered for everyone: anonymous guests and authenticated users */
    app: React.ReactNode;
    /** Rendered when a real (non-anonymous) user has not yet chosen a username */
    needsUsername: React.ReactNode;
    /** Rendered while auth state is being resolved on startup */
    loading?: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({
    app,
    needsUsername,
    loading = null,
}) => {
    const { user, isSyncing, skipUsernameSetup, isSkipLoaded } = useAuthStore();

    // Rule 1: Firebase is still resolving auth state on startup or skip preference is loading from disk
    if (isSyncing || !isSkipLoaded) return <>{loading}</>;

    // Rule 2: Real authenticated user who hasn't picked a username yet
    // → show ChooseUsername. User can skip — this is not a hard block.
    const isRealUser = user && !user.isAnonymous;
    const hasUsername = Boolean(user?.username?.trim());
    if (isRealUser && !hasUsername && !skipUsernameSetup) return <>{needsUsername}</>;

    // Rule 3: Anonymous guest OR authenticated with username OR skipped username step
    return <>{app}</>;
};


/**
 * Hook version — use inside components to check current auth status.
 * Prefer AuthGate component for routing. Use this for in-screen logic
 * (e.g. showing a nudge card, gating a comment action, etc.).
 */
export const useAuthGate = () => {
    const { user, isSyncing } = useAuthStore();

    const isLoading = isSyncing;
    const isAnonymous = !user || user.isAnonymous;
    const isAuthenticated = !isAnonymous;
    const hasUsername = isAuthenticated && Boolean(user?.username?.trim());
    const isFullyOnboarded = isAuthenticated && hasUsername;

    return {
        isLoading,
        isAnonymous,
        isAuthenticated,
        hasUsername,
        isFullyOnboarded,
    };
};
