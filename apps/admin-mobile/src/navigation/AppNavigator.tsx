import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { useTheme } from '../theme/ThemeProvider';

export const AppNavigator = () => {
    const { admin, isLoading } = useAuth();
    const isInitialLoad = React.useRef(true);
    const { colors } = useTheme();

    if (isLoading && isInitialLoad.current) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!isLoading) {
        isInitialLoad.current = false;
    }

    return admin ? <AdminNavigator /> : <AuthNavigator />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});


