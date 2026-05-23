import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface AuthGateProps {
    app: React.ReactNode;
    needsUsername: React.ReactNode;
    loading?: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({
    app,
    needsUsername,
    loading = null,
}) => {
    const { user, isSyncing, skipUsernameSetup, isSkipLoaded } = useAuthStore();

    if (isSyncing || !isSkipLoaded) return <>{loading}</>;

    const isRealUser = Boolean(user && !user.isAnonymous);
    const hasUsername = Boolean(user?.username?.trim());

    if (isRealUser && !hasUsername && !skipUsernameSetup) {
        return <>{needsUsername}</>;
    }

    return <>{app}</>;
};

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
