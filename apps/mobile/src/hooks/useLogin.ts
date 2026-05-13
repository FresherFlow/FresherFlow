import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import * as Schemas from '@fresherflow/schemas';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const useLogin = (route: Props['route'] | { params?: { prefilledEmail?: string } }) => {
    const { sendOtp, verifyOtp } = useAuth();
    const { requestPushPermission } = useNotifications();
    const [email, setEmail] = useState(route.params?.prefilledEmail || '');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(!!route.params?.prefilledEmail);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendOtp = useCallback(async () => {
        const trimmedEmail = email.trim();

        let validation;
        try {
            validation = Schemas.sendOtpSchema.safeParse({ email: trimmedEmail });
        } catch (e) {
            console.error('[Auth] CRITICAL: Schema validation crashed:', e);
            Alert.alert('System Error', 'Validation engine crashed. Please check console logs.');
            return;
        }

        if (!validation.success) {
            console.warn('[Auth] Validation failed:', JSON.stringify(validation.error.format(), null, 2));
            Alert.alert('Invalid Email', validation.error.issues[0]?.message || 'Invalid email');
            return;
        }

        setLoading(true);
        try {
            await sendOtp(email.trim());
            setOtpSent(true);
            setResendTimer(60);
        } catch (error: unknown) {
            console.error('[Auth] Failed to send OTP:', error);
            const msg = error instanceof Error ? error.message : 'Could not send code';
            Alert.alert('Verification Failed', `${msg}\n\nPlease check your internet connection and if the API is reachable.`);
        } finally {
            setLoading(false);
        }
    }, [email, sendOtp]);

    const handleResend = useCallback(async () => {
        if (resendTimer > 0 || loading) return;
        void handleSendOtp();
    }, [resendTimer, loading, handleSendOtp]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerifyOtp = useCallback(async () => {
        const validation = Schemas.verifyOtpSchema.safeParse({ email: email.trim(), code: otp.trim() });
        if (!validation.success) {
            Alert.alert('Invalid Input', validation.error.issues[0]?.message || 'Invalid code');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(email.trim(), otp.trim());

            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after login', e);
            }
        } catch (error: unknown) {
            console.error('[Auth] Verification failed:', error);
            setOtp(''); // Clear OTP on failure to stop the loop
            Alert.alert('Login failed', (error as Error).message || 'Could not verify code');
        } finally {
            setLoading(false);
        }
    }, [email, otp, verifyOtp, requestPushPermission]);

    return {
        email, setEmail,
        otp, setOtp,
        otpSent, setOtpSent,
        loading,
        handleSendOtp,
        handleVerifyOtp,
        handleResend,
        resendTimer,
    };
};
