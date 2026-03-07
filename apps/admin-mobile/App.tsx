import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { ToastProvider } from './src/components/ToastProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initSentry } from './src/lib/sentry';

initSentry();

function ThemedApp() {
    const { mode } = useTheme();
    return (
        <ToastProvider>
            <NavigationContainer>
                <AppNavigator />
                <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            </NavigationContainer>
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
