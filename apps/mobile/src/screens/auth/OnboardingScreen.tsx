import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { haptic } from '@/utils/haptics';
import { mScale, SPACING } from '@/system/constants/dimensions';

// Reuse existing screens exactly as they are without duplicating their UI code!
import AuthScreen from '@/screens/auth/AuthScreen';
import ChooseUsernameScreen from '@/screens/auth/ChooseUsernameScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding' | any>;

export const OnboardingScreen: React.FC<Props> = ({ navigation, route }) => {
    const { currentTheme } = useTheme();
    const { user, isAuthenticated, skipUsernameSetup, isSyncing, loginAnonymously, skipUsername } = useAuthStore() as any;

    const [step, setStep] = useState<number>(0);
    const [skippingAuth, setSkippingAuth] = useState(false);

    // Step 0 -> Step 1: Advance when user successfully authenticates, or complete if anonymous guest
    useEffect(() => {
        if (step === 0 && user) {
            if (isSyncing) {
                // Wait for the fast Firebase sync/hydration to resolve the username before navigating
                return;
            }
            if (user.isAnonymous) {
                void handleFinishOnboarding();
            } else if (user.username?.trim() || skipUsernameSetup) {
                void handleFinishOnboarding();
            } else if (isAuthenticated) {
                setStep(1);
            }
        }
    }, [isAuthenticated, skipUsernameSetup, user, isSyncing, step]);

    // Step 1 -> Finish: Complete onboarding when user has a handle or chooses to skip handle setup
    useEffect(() => {
        if (step === 1) {
            const hasUsername = Boolean(user?.username?.trim());
            if (hasUsername || skipUsernameSetup) {
                void handleFinishOnboarding();
            }
        }
    }, [user?.username, skipUsernameSetup, step]);

    // Handle skip Authentication (Sign in Anonymously)
    const handleSkipAuth = async () => {
        if (skippingAuth) return;
        setSkippingAuth(true);
        haptic.light();
        try {
            if (loginAnonymously) {
                await loginAnonymously();
            }
            setStep(1);
        } catch (err) {
            setStep(1);
        } finally {
            setSkippingAuth(false);
        }
    };

    // Handle skip Username handle
    const handleSkipUsername = () => {
        haptic.medium();
        if (skipUsername) {
            skipUsername();
        }
        void handleFinishOnboarding();
    };

    // Finalize onboarding and go to feed screen
    const handleFinishOnboarding = async () => {
        haptic.success();
        try {
            await AsyncStorage.setItem('ff_onboarding_completed', 'true');
        } catch {}
        navigation.replace('Main');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            {/* Steps layout container */}
            <View style={styles.content}>
                {step === 0 && (
                    <View style={styles.flex}>
                        <AuthScreen navigation={navigation} route={route} isOnboarding={true} />
                    </View>
                )}

                {step === 1 && (
                    <View style={styles.flex}>
                        <ChooseUsernameScreen navigation={navigation} route={route} isOnboarding={true} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    headerActions: {
        position: 'absolute',
        right: SPACING.md,
        zIndex: 9999,
    },
    skipHeaderBtn: {
        padding: SPACING.sm,
    },
    skipHeaderText: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: 0.5,
        textDecorationLine: 'underline',
    },
    finishBtn: {
        padding: SPACING.sm,
    },
    finishBtnText: {
        fontSize: mScale(14),
        fontWeight: '900',
        letterSpacing: 0.5,
    }
});

export default OnboardingScreen;
