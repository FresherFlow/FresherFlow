import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@fresherflow/api-client';
import { AuthResponse } from '@fresherflow/types';
import { flushOfflineActions } from '@repo/frontend-core';

export const useAuthHandshake = () => {
    const { firebaseUser, user, setAuth, setSyncing, handshakeTrigger } = useAuthStore();
    const isHandshaking = useRef(false);
    const retryCount = useRef(0); // <-- Ref to track retry attempts
    const lastHandshakeTime = useRef(0); // <-- Ref to track last handshake timestamp for rate limiting

    useEffect(() => {
        const performHandshake = async (isRetry = false) => {
            if (!firebaseUser || isHandshaking.current) return;
            
            const now = Date.now();
            if (now - lastHandshakeTime.current < 5000) {
                console.log('[Auth] Handshake rate-limited (last attempt was < 5s ago)');
                return;
            }
            lastHandshakeTime.current = now;
            
            const isDifferentUser = user && user.id !== firebaseUser.uid;
            const isForced = handshakeTrigger > 0;
            if (user && user.isOptimistic === false && !isDifferentUser && !isForced) return;

            isHandshaking.current = true;

            try {
                const idToken = await firebaseUser.getIdToken(true);
                const { referralCode, setReferralCode } = useAuthStore.getState();
                
                const response = await authApi.handshake(idToken, referralCode || undefined) as AuthResponse;

                if (response.user && response.accessToken) {
                    console.log(`[Auth] Handshake successful for ${response.user.username || 'no-handle'}`);
                    setAuth(response.user, response.accessToken);
                    
                    if (referralCode) setReferralCode(null);
                    await flushOfflineActions(response.user.id as string);
                }
            } catch (error) {
                console.error('[Auth] Handshake failed:', error);
                
                // Silently retry exactly once after 15 seconds
                if (retryCount.current < 1) {
                    retryCount.current += 1;
                    console.log('[Auth] Scheduling silent retry in 15 seconds...');
                    setTimeout(() => {
                        void performHandshake(true);
                    }, 15000);
                }
            } finally {
                isHandshaking.current = false;
            }
        };

        void performHandshake();
    }, [firebaseUser, user, setAuth, setSyncing, handshakeTrigger]);
};
