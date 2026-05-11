import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { AlertsControlCard } from './components/AlertsControlCard';
import { ChannelStatusCard } from './components/ChannelStatusCard';
import { ConfigHealthCard } from './components/ConfigHealthCard';
import { DispatchLogCard } from './components/DispatchLogCard';
import { LinkHealthCard } from './components/LinkHealthCard';
import { OtaUpdateCard } from './components/OtaUpdateCard';
import { useSystem } from './hooks/useSystem';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    Screen, 
    Section,
    PremiumHeader,
} from './layout/Layout';

export const SystemScreen = () => {
    const navigation = useNavigation<{ navigate: (screen: string, params?: Record<string, unknown>) => void; getParent: () => NavigationProp<Record<string, unknown>> | undefined }>();
    const { colors, spacing } = useTheme();
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
        feedbackAlerts,
        telegramSummary,
        socialSummary,
        fetchAll,
        runVerification,
        runAlerts,
        runBackfill,
        refreshMetrics,
        checkForOtaUpdate,
        installOtaUpdate,
    } = useSystem();

    useFocusEffect(useCallback(() => {
        void fetchAll();
    }, [fetchAll]));

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchAll();
    }, [fetchAll, setRefreshing]);

    return (
        <Screen>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <PremiumHeader title="Ops" subtitle="System health" />

                {(loading && !feedbackAlerts) ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : (
                    <View style={{ gap: spacing.lg }}>
                        <Section title="Channels">
                            <ChannelStatusCard
                                feedbackAlerts={feedbackAlerts}
                                telegramSummary={telegramSummary}
                                socialSummary={socialSummary}
                                onOpenFeedback={() => navigation.getParent()?.navigate('Settings', { screen: 'Feedback' })}
                                onOpenTelegram={() => navigation.navigate('TelegramBroadcasts')}
                                onOpenSocial={() => navigation.navigate('SocialPosts')}
                            />
                        </Section>

                        <Section title="Link verification">
                            <LinkHealthCard stats={linkStats} runningVerify={runningVerify} onVerify={runVerification} />
                        </Section>

                        <Section title="Alert controls">
                            <AlertsControlCard
                                runningAlerts={runningAlerts}
                                onRunAlerts={runAlerts}
                                runningBackfill={runningBackfill}
                                onRunBackfill={runBackfill}
                                runningRefresh={runningRefresh}
                                onRefreshMetrics={refreshMetrics}
                            />
                        </Section>

                        <Section title="Dispatch logs">
                            <DispatchLogCard logs={dispatchLogs} />
                        </Section>

                        <Section title="OTA rollout">
                            <OtaUpdateCard
                                statusText={otaStatusText}
                                checkingOta={checkingOta}
                                installingOta={installingOta}
                                otaAvailable={otaAvailable}
                                onCheck={checkForOtaUpdate}
                                onInstall={installOtaUpdate}
                            />
                        </Section>

                        <Section title="Config readiness">
                            <ConfigHealthCard health={health} />
                        </Section>
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
};


