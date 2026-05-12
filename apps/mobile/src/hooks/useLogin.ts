import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import { sendOtpSchema, verifyOtpSchema } from '@fresherflow/schemas';
import { profileApi } from '@fresherflow/api-client';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const useLogin = (route: Props['route']) => {
    const { sendOtp, verifyOtp, refreshMe } = useAuth();
    const { requestPushPermission } = useNotifications();
    const [email, setEmail] = useState(route.params?.prefilledEmail || '');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(!!route.params?.prefilledEmail);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendOtp = useCallback(async () => {
        const validation = sendOtpSchema.safeParse({ email: email.trim() });
        if (!validation.success) {
            Alert.alert('Invalid Email', validation.error.issues[0]?.message || 'Invalid email');
            return;
        }

        setLoading(true);
        try {
            await sendOtp(email.trim());
            setOtpSent(true);
            setResendTimer(60);
        } catch (error: unknown) {
            Alert.alert('Failed', (error as Error).message || 'Could not send code');
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
        const validation = verifyOtpSchema.safeParse({ email: email.trim(), code: otp.trim() });
        if (!validation.success) {
            Alert.alert('Invalid Input', validation.error.issues[0]?.message || 'Invalid code');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(email.trim(), otp.trim());

            // If we have a prefilled name, this was a registration; update the name
            if (route.params?.prefilledName) {
                try {
                    await profileApi.updateProfile({ fullName: route.params.prefilledName });
                    await refreshMe();
                } catch (e) {
                    console.error('Failed to update name after registration', e);
                }
            }
            
            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after login', e);
            }
        } catch (error: unknown) {
            Alert.alert('Login failed', (error as Error).message || 'Could not verify code');
        } finally {
            setLoading(false);
        }
    }, [email, otp, route?.params?.prefilledName, verifyOtp, refreshMe, requestPushPermission]);

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
