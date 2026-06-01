import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi, profileApi } from '@fresherflow/api-client';
import { AuthResponse } from '@fresherflow/types';
import { flushOfflineActions, secureStorage } from '@repo/frontend-core';
import { flushOnboardingSyncQueue } from '@/utils/onboardingState';
import { saveLocalProfile } from '@/utils/cache/localProfile';
import { readFirebaseProfile, writeFirebaseProfile } from '@/utils/firebaseProfileDb';




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
                    
                    // 1. Explicitly await the token write before flushing the sync queue.
                    //    setAuth() uses `void secureStorage.setItem(...)` (fire-and-forget),
                    //    so without this the API interceptor sends queued requests without auth headers.
                    await secureStorage.setItem('ff_auth_token_v1', response.accessToken);
                    setAuth(response.user, response.accessToken);
                    if (referralCode) setReferralCode(null);

                    // 2. Hydrate career profile — Firebase first (fast), API as fallback for new/existing users
                    try {
                        // Firebase RTDB path keyed by Firebase UID (auth.uid) — NOT Postgres UUID
                        let profile = await readFirebaseProfile(firebaseUser.uid);

                        if (!profile) {
                            // Firebase empty (new user or pre-Firebase feature) — pull from API and backfill Firebase
                            console.log('[Auth] No Firebase profile found, falling back to API');
                            const profileRes = await profileApi.get() as { profile: any };
                            profile = profileRes?.profile || null;

                            // Backfill Firebase so next login is fast
                            if (profile) {
                                void writeFirebaseProfile(firebaseUser.uid, profile);
                            }
                        }

                        if (profile) {
                            await saveLocalProfile(profile, response.user.id as string);
                            console.log('[Auth] Career profile hydrated after handshake');
                        }
                    } catch (profileError) {
                        console.warn('[Auth] Profile hydration failed:', profileError);
                    }

                    await flushOnboardingSyncQueue(response.user.id as string, firebaseUser.uid);
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
