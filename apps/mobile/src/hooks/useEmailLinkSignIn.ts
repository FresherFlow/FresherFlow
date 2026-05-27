import { useEffect } from 'react';
import { } from 'react-native';
import * as Linking from 'expo-linking';
import auth, { isFirebaseAuthAvailable } from '@/config/firebase';
import { storage } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';

export const useEmailLinkSignIn = () => {
    const { showToast, showError } = useToast();

    useEffect(() => {
        if (!isFirebaseAuthAvailable()) return;

        const handleDeepLink = async (event: { url: string }) => {
            const url = event.url;
            try {
                const isEmailLink = await auth().isSignInWithEmailLink(url);
                if (isEmailLink) {
                    console.log('[Auth] Intercepted email sign-in link:', url);

                    const email = await storage.getItem('ff_email_for_sign_in');
                    if (!email) {
                        showToast(
                            'For security, please open the sign-in link on the same device where you requested it.',
                            'warning'
                        );
                        return;
                    }

                    // Complete sign in natively via Firebase Client SDK
                    await auth().signInWithEmailLink(email.trim(), url);

                    // Clear the stored email on success
                    await storage.removeItem('ff_email_for_sign_in');

                    console.log('[Auth] Successfully authenticated via email link!');
                }
            } catch (error: unknown) {
                console.error('[Auth] Error handling deep link:', error);
                showError(
                    'The sign-in link may have expired or is invalid. Please request a new link.'
                );
            }
        };

        // Check for initial URL (cold start)
        Linking.getInitialURL().then((url) => {
            if (url) {
                void handleDeepLink({ url });
            }
        });

        // Add listener (warm start)
        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);
};
