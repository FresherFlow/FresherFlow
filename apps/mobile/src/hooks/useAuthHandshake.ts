import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@fresherflow/api-client';
import { flushOfflineActions } from '@repo/frontend-core';
import { Alert } from 'react-native';

export const useAuthHandshake = () => {
    const { firebaseUser, user, anonSessionId, setAuth, setSyncing, isSyncing } = useAuthStore();
    const isHandshaking = useRef(false);

    useEffect(() => {
        const performHandshake = async () => {
            if (!firebaseUser || !anonSessionId || isHandshaking.current) return;
            
            // Check if we already have a real session (not optimistic)
            // @ts-ignore - isOptimistic is an internal flag we added in the store
            if (user && !user.isOptimistic) return;

            isHandshaking.current = true;
            setSyncing(true);

            try {
                const idToken = await firebaseUser.getIdToken();
                
                // Call the handshake endpoint on the Render API
                const response = await authApi.handshake(idToken, anonSessionId) as { 
                    user: any; 
                    accessToken?: string;
                };

                if (response.user && response.accessToken) {
                    setAuth(response.user, response.accessToken);
                    
                    // On success, flush all buffered offline actions
                    console.log('[Auth] Handshake successful, flushing offline actions...');
                    await flushOfflineActions(response.user.id);
                }
            } catch (error) {
                console.error('[Auth] Handshake failed:', error);
                // We don't alert here to avoid annoying the user while they use the optimistic UI.
                // The next action they take will trigger a retry or show an error.
            } finally {
                isHandshaking.current = false;
                setSyncing(false);
            }
        };

        void performHandshake();
    }, [firebaseUser, user, setAuth, setSyncing]);
};
