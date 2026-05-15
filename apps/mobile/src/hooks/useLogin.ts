import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserAuth as useAuth, useNotifications } from '@repo/frontend-core';
import { z } from 'zod';
import { auth } from '@/config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signInWithCustomToken } from '@react-native-firebase/auth';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const authSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits').optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export const useLogin = (route: Props['route'] | { params?: { prefilledEmail?: string } }) => {
    const { sendOtp, verifyOtp } = useAuth();
    const { requestPushPermission } = useNotifications();
    const [otpSent, setOtpSent] = useState(!!route.params?.prefilledEmail);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isValid },
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
        try {
            await sendOtp(data.email.trim());
            setOtpSent(true);
            setResendTimer(60);
        } catch (error: unknown) {
            console.error('[Auth] Failed to send OTP:', error);
            const msg = error instanceof Error ? error.message : 'Could not send code';
            Alert.alert('Verification Failed', `${msg}\n\nPlease check your internet connection.`);
        } finally {
            setLoading(false);
        }
    }, [sendOtp]);

    const handleGoogleSignIn = useCallback(async () => {
        setLoading(true);
        try {
            // Get the users ID token
            const response = await GoogleSignin.signIn();
            const idToken = response.data?.idToken;

            if (!idToken) throw new Error('No ID token found');


            // Create a Google credential with the token
            const googleCredential = GoogleAuthProvider.credential(idToken);

            // Sign-in the user with the credential
            // This will trigger onAuthStateChanged in useAuthStore for "Instant Auth"
            await signInWithCredential(auth, googleCredential);
            
            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after google login', e);
            }
        } catch (error: any) {
            console.error('[Auth] Google Sign-In failed:', error);
            if (error.code !== 'ASYNC_OP_IN_PROGRESS') {
                Alert.alert('Google Sign-In failed', 'Could not complete authentication.');
            }
        } finally {
            setLoading(false);
        }
    }, [requestPushPermission]);

    const handleResend = useCallback(async () => {
        if (resendTimer > 0 || loading) return;
        await handleSendOtp({ email, otp });
    }, [resendTimer, loading, handleSendOtp, email, otp]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerifyOtp = useCallback(async (data: AuthFormData) => {
        if (!data.otp) return;
        
        setLoading(true);
        try {
            const result = await verifyOtp(data.email.trim(), data.otp.trim());
            
            // Bridge custom OTP backend with Firebase Instant Auth
            if (result && result.firebaseCustomToken) {
                await signInWithCustomToken(auth, result.firebaseCustomToken);
            }
            try {
                await requestPushPermission();
            } catch (e) {
                console.warn('Failed to register push after login', e);
            }
        } catch (error: unknown) {
            console.error('[Auth] Verification failed:', error);
            setValue('otp', ''); // Clear OTP on failure
            Alert.alert('Login failed', (error as Error).message || 'Could not verify code');
        } finally {
            setLoading(false);
        }
    }, [verifyOtp, requestPushPermission, setValue]);

    return {
        control,
        handleSubmit,
        email,
        otp,
        otpSent,
        setOtpSent,
        loading,
        handleSendOtp,
        handleVerifyOtp,
        handleGoogleSignIn,
        handleResend,
        resendTimer,
        errors,
        isValid,
        setValue,
    };
};
