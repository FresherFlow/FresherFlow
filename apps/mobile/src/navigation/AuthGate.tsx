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
    const { user, isSyncing, isHandshaking, skipUsernameSetup, isSkipLoaded } = useAuthStore();

    const hasUsername = Boolean(user?.username?.trim());
    const isRealUser = Boolean(user && !user.isAnonymous);
    const isLoading = isSyncing || !isSkipLoaded || (isHandshaking && !hasUsername && !skipUsernameSetup) || (isRealUser && user?.isOptimistic && !skipUsernameSetup);
    
    if (isLoading) return <>{loading}</>;

    if (isRealUser && !hasUsername && !skipUsernameSetup) {
        return <>{needsUsername}</>;
    }

    return <>{app}</>;
};

export const useAuthGate = () => {
    const { user, isSyncing, isHandshaking, skipUsernameSetup } = useAuthStore();

    const isAnonymous = !user || user.isAnonymous;
    const isAuthenticated = !isAnonymous;
    const hasUsername = isAuthenticated && Boolean(user?.username?.trim());
    const isLoading = isSyncing || (isHandshaking && !hasUsername && !skipUsernameSetup) || (isAuthenticated && user?.isOptimistic && !skipUsernameSetup);
    const isFullyOnboarded = isAuthenticated && hasUsername;

    return {
        isLoading,
        isAnonymous,
        isAuthenticated,
        hasUsername,
        isFullyOnboarded,
    };
};
