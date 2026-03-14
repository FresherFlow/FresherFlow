import React, { useCallback } from 'react';
import {
    StyleSheet, View, ScrollView,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { theme } from '../theme';
import { useSystemScreen } from '../hooks/useSystemScreen';

// Components
import { LinkHealthCard } from '../components/system/LinkHealthCard';
import { AlertsControlCard } from '../components/system/AlertsControlCard';
import { DispatchLogCard } from '../components/system/DispatchLogCard';
import { OtaUpdateCard } from '../components/system/OtaUpdateCard';
import { ConfigHealthCard } from '../components/system/ConfigHealthCard';

export const SystemScreen = () => {
    const {
        health,
        linkStats,
        loading,
        refreshing,
        setRefreshing,
        runningVerify,
        runningAlerts,
        runningBackfill,
        runningRefresh,
        checkingOta,
        installingOta,
        otaAvailable,
        otaStatusText,
        dispatchLogs,
        fetchAll,
        runVerification,
        runAlerts,
        runBackfill,
        refreshMetrics,
        checkForOtaUpdate,
        installOtaUpdate
    } = useSystemScreen();

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <View style={styles.sectionsContainer}>
                    <LinkHealthCard 
                        stats={linkStats} 
                        runningVerify={runningVerify} 
                        onVerify={runVerification} 
                    />

                    <AlertsControlCard 
                        runningAlerts={runningAlerts}
                        onRunAlerts={runAlerts}
                        runningBackfill={runningBackfill}
                        onRunBackfill={runBackfill}
                        runningRefresh={runningRefresh}
                        onRefreshMetrics={refreshMetrics}
                    />

                    <DispatchLogCard logs={dispatchLogs} />

                    <OtaUpdateCard 
                        statusText={otaStatusText}
                        checkingOta={checkingOta}
                        installingOta={installingOta}
                        otaAvailable={otaAvailable}
                        onCheck={checkForOtaUpdate}
                        onInstall={installOtaUpdate}
                    />

                    <ConfigHealthCard health={health} />
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 40, paddingTop: 8 },
    sectionsContainer: { paddingHorizontal: 16 },
});
