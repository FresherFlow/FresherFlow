import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { useTheme } from '../theme/ThemeProvider';

export const AppNavigator = () => {
    const { admin, isLoading } = useAuth();
    const isInitialLoad = React.useRef(true);
    const { currentTheme } = useTheme();

    if (isLoading && isInitialLoad.current) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            </View>
        );
    }

    if (!isLoading) {
        isInitialLoad.current = false;
    }

    const hasAdminAccess = admin && admin.role === 'ADMIN';

    return hasAdminAccess ? <AdminNavigator /> : <AuthNavigator />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
