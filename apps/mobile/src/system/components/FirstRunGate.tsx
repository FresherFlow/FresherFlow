import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StoryIntroScreen from '../../screens/onboarding/StoryIntroScreen';

const FIRST_RUN_KEY = 'ff_first_run_done';

interface FirstRunGateProps {
    children: React.ReactNode;
    onDismiss?: () => void;
}

export const FirstRunGate: React.FC<FirstRunGateProps> = ({ children, onDismiss }) => {
    const [isVisible, setIsVisible] = useState<boolean | null>(null);

    useEffect(() => {
        const checkFirstRun = async () => {
            try {
                const done = await AsyncStorage.getItem(FIRST_RUN_KEY);
                setIsVisible(done !== 'true');
            } catch {
                setIsVisible(false);
            }
        };
        void checkFirstRun();
    }, []);

    const handleDismiss = async () => {
        setIsVisible(false);
        try {
            await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
        } catch (e) {
            console.error('[FirstRunGate] Failed to save flag', e);
        }
        if (onDismiss) {
            onDismiss();
        }
    };

    if (isVisible === null) return null; // loading

    return (
        <View style={styles.container}>
            {children}
            {isVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
                    <StoryIntroScreen onComplete={handleDismiss} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
