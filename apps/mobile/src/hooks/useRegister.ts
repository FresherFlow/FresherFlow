import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { registerSchema } from '@fresherflow/schemas';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const useRegister = (navigation: Props['navigation']) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = useCallback(async () => {
        const validation = registerSchema.safeParse({ fullName, email: email.trim() });
        if (!validation.success) {
            Alert.alert('Invalid Input', validation.error.issues[0]?.message || 'Check your fields');
            return;
        }

        setLoading(true);
        try {
            // Just navigate to login with params, login handles the OTP sync and name update
            navigation.navigate('Login', { prefilledEmail: email.trim(), prefilledName: fullName.trim() });
        } catch {
            Alert.alert('Failed', 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [fullName, email, navigation]);

    return {
        fullName, setFullName,
        email, setEmail,
        loading,
        handleRegister,
    };
};
