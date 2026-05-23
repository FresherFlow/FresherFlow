import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@fresherflow/api-client';
import { AuthResponse } from '@fresherflow/types';
import { flushOfflineActions } from '@repo/frontend-core';
import { flushOnboardingSyncQueue } from '@/utils/onboardingState';

export const useAuthHandshake = () => {
    const { firebaseUser, user, setAuth, setSyncing, handshakeTrigger } = useAuthStore();
    const isHandshaking = useRef(false);
    const retryCount = useRef(0); // <-- Ref to track retry attempts
    const lastHandshakeTime = useRef(0); // <-- Ref to track last handshake timestamp for rate limiting

    useEffect(() => {
        const performHandshake = async () => {
            if (!firebaseUser || firebaseUser.isAnonymous || isHandshaking.current) return;
            
            const now = Date.now();
            if (now - lastHandshakeTime.current < 5000) {
                console.log('[Auth] Handshake rate-limited (last attempt was < 5s ago)');
                return;
            }
            lastHandshakeTime.current = now;
            
            const isDifferentUser = user && user.id !== firebaseUser.uid;
            const isForced = handshakeTrigger > 0;
            const hasAccessToken = Boolean(useAuthStore.getState().token);
            if (user && user.isOptimistic != true && !isDifferentUser && !isForced && hasAccessToken) return;

            isHandshaking.current = true;

            try {
                // The backend requires a fresh token to verify auth_time, otherwise it throws 403.
                // Since this runs in the background, forcing a refresh is safe.
                const idToken = await firebaseUser.getIdToken(true);
                const { referralCode, setReferralCode } = useAuthStore.getState();
                
                const response = await authApi.handshake(idToken, referralCode || undefined) as AuthResponse;

                if (response.user && response.accessToken) {
                    console.log(`[Auth] Handshake successful for ${response.user.username || 'no-handle'}`);
                    setAuth(response.user, response.accessToken);
                    
                    if (referralCode) setReferralCode(null);
                    await flushOnboardingSyncQueue(response.user.id as string);
                    await flushOfflineActions(response.user.id as string);
                }
            } catch (error) {
                console.error('[Auth] Handshake failed:', error);
                
                const retryDelays = [15000, 30000, 60000];
                if (retryCount.current < retryDelays.length) {
                    const delay = retryDelays[retryCount.current];
                    retryCount.current += 1;
                    console.log(`[Auth] Scheduling silent retry in ${Math.round(delay / 1000)} seconds...`);
                    setTimeout(() => {
                        void performHandshake();
                    }, delay);
                }
            } finally {
                isHandshaking.current = false;
            }
        };

        void performHandshake();
    }, [firebaseUser, user, setAuth, setSyncing, handshakeTrigger]);
};
