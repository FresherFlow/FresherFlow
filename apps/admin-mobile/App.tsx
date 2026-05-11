import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { 
    AdminAuthProvider as AuthProvider, 
    secureStorage
} from '@repo/frontend-core';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { ToastProvider } from './src/components/ToastProvider';
import { ErrorBoundary } from './src/features/system/components/ErrorBoundary';
import { initSentry } from './src/lib/sentry';
import { configureClient } from '@fresherflow/api-client';

initSentry();
configureClient(undefined, secureStorage);

function ThemedApp() {
    const { isReady, mode, colors } = useTheme();

    const navigationTheme = mode === 'dark'
        ? {
            ...DarkTheme,
            colors: {
                ...DarkTheme.colors,
                background: colors.background,
                card: colors.surface,
                border: colors.border,
                primary: colors.primary,
                text: colors.text,
                notification: colors.accent,
            },
        }
        : {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: colors.background,
                card: colors.surface,
                border: colors.border,
                primary: colors.primary,
                text: colors.text,
                notification: colors.accent,
            },
        };

    if (!isReady) {
        return (
            <View style={[styles.loadingShell, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ToastProvider>
            <View style={[styles.appShell, { backgroundColor: colors.background }]}>
                <NavigationContainer theme={navigationTheme}>
                    <AppNavigator />
                    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent />
                </NavigationContainer>
            </View>
        </ToastProvider>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <ThemedApp />
                    </AuthProvider>
                </ThemeProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    appShell: {
        flex: 1,
    },
    loadingShell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
