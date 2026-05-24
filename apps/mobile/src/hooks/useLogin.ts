import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNotifications, storage } from '@repo/frontend-core';
import { z } from 'zod';
import { auth, createAppleCredential, createGoogleCredential, getFirebaseAuthDomain } from '@/config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const authSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits').or(z.literal('')),
});

type AuthFormData = z.infer<typeof authSchema>;

export const useLogin = (route: Props['route'] | { params?: { prefilledEmail?: string } }) => {
    const { requestPushPermission } = useNotifications();
    const [otpSent, setOtpSent] = useState(!!route.params?.prefilledEmail);
    const [loading, setLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<AuthFormData>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: route.params?.prefilledEmail || '',
            otp: '',
        },
        mode: 'onChange',
    });

    const email = watch('email');
    const otp = watch('otp') || '';

    const handleSendOtp = useCallback(async (data: AuthFormData) => {
        setLoading(true);
        setEmailLoading(true);
        try {
            const trimmedEmail = data.email.trim();

            const actionCodeSettings = {
                url: `https://${getFirebaseAuthDomain()}/__/auth/links`,
                handleCodeInApp: true,
                android: {
                    packageName: 'in.fresherflow.app',
                    installApp: true,
                    minimumVersion: '12',
                },
                ios: {
                    bundleId: 'in.fresherflow.app',
                },
            };

            // Send passwordless verification link via Firebase Client SDK
            await auth().sendSignInLinkToEmail(trimmedEmail, actionCodeSettings);

            // Securely cache the email locally to complete verification on deep link entry
            await storage.setItem('ff_email_for_sign_in', trimmedEmail);

            setOtpSent(true);
            setResendTimer(60);
        } catch (error: unknown) {
            console.error('[Auth] Failed to send email magic link:', error);
            const msg = error instanceof Error ? error.message : 'Could not send sign-in link';
            Alert.alert('Verification Failed', `${msg}\n\nPlease check your internet connection.`);
        } finally {
            setLoading(false);
            setEmailLoading(false);
        }
    }, []);

    const handleGoogleSignIn = useCallback(async () => {
        setLoading(true);
        setGoogleLoading(true);
        try {
            // Get the users ID token
            const response = await GoogleSignin.signIn();
            const idToken = response.data?.idToken;

            if (!idToken) throw new Error('No ID token found');

            // Create a Google credential with the token
            const googleCredential = createGoogleCredential(idToken);

            // Sign-in the user with the credential
            // This will trigger onAuthStateChanged in useAuthStore for "Instant Auth"
            await auth().signInWithCredential(googleCredential);

            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after google login', e);
            }
        } catch (error: unknown) {
            console.error('[Auth] Google Sign-In failed:', error);
            if (error && typeof error === 'object' && 'code' in error && error.code !== 'ASYNC_OP_IN_PROGRESS') {
                Alert.alert('Google Sign-In failed', 'Could not complete authentication.');
            }
        } finally {
            setLoading(false);
            setGoogleLoading(false);
        }
    }, [requestPushPermission]);

    const handleAppleSignIn = useCallback(async () => {
        setLoading(true);
        setAppleLoading(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) throw new Error('No identity token found');

            // Create a Firebase credential
            const firebaseCredential = createAppleCredential({
                idToken: credential.identityToken,
                accessToken: credential.authorizationCode || undefined,
            });

            // Sign-in with Firebase
            await auth().signInWithCredential(firebaseCredential);

            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after apple login', e);
            }
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_CANCELED') {
                // User canceled the flow - silent fail
            } else {
                console.error('[Auth] Apple Sign-In failed:', error);
                Alert.alert('Apple Sign-In failed', 'Could not complete authentication.');
            }
        } finally {
            setLoading(false);
            setAppleLoading(false);
        }
    }, [requestPushPermission]);

    const handleResend = useCallback(async () => {
        if (resendTimer > 0 || loading) return;
        // Only pass email — otp is irrelevant when resending a magic link
        await handleSendOtp({ email, otp: '' });
    }, [resendTimer, loading, handleSendOtp, email]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerifyOtp = useCallback(async () => {
        // Kept as a dummy function to satisfy exports and UI compatibility
        return false;
    }, []);

    return {
        control,
        handleSubmit,
        email,
        otp,
        otpSent,
        setOtpSent,
        loading,
        emailLoading,
        googleLoading,
        appleLoading,
        handleSendOtp,
        handleVerifyOtp,
        handleGoogleSignIn,
        handleAppleSignIn,
        handleResend,
        resendTimer,
        errors,
        setValue,
    };
};
