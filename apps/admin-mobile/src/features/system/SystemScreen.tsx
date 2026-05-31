import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { BellRing } from 'lucide-react-native';
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
} from '../system/layout/Layout';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { RADIUS, SPACING, mScale } from '../../theme/dimensions';

export const SystemScreen = () => {
    const navigation = useNavigation<{ 
        navigate: (screen: string, params?: Record<string, unknown>) => void; 
        getParent: () => NavigationProp<Record<string, unknown>> | undefined 
    }>();
    const { currentTheme } = useTheme();
    const {
        health,
        linkStats,
        loading,
        refreshing,
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
        void fetchAll();
    }, [fetchAll]);

    return (
        <Screen safe={true}>
            <SimpleHeader title="System Control" />

            <ScrollView
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={currentTheme.colors.primary} 
                    />
                }
                contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 140 }}
            >
                {(loading && !feedbackAlerts) ? (
                    <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                    </View>
                ) : (
                    <View style={{ gap: SPACING.lg }}>
                        <Section title="Channel Status">
                            <ChannelStatusCard
                                feedbackAlerts={feedbackAlerts}
                                telegramSummary={telegramSummary}
                                socialSummary={socialSummary}
                                onOpenFeedback={() => navigation.getParent()?.navigate('Settings', { screen: 'Feedback' })}
                                onOpenTelegram={() => navigation.navigate('TelegramBroadcasts')}
                                onOpenSocial={() => navigation.navigate('SocialPosts')}
                            />
                        </Section>

                        <Section title="Link Verification">
                            <LinkHealthCard 
                                stats={linkStats} 
                                runningVerify={runningVerify} 
                                onVerify={runVerification} 
                            />
                        </Section>

                        <Section title="Alert & Sync Control">
                            <AlertsControlCard
                                runningAlerts={runningAlerts}
                                onRunAlerts={runAlerts}
                                runningBackfill={runningBackfill}
                                onRunBackfill={runBackfill}
                                runningRefresh={runningRefresh}
                                onRefreshMetrics={refreshMetrics}
                            />
                            <TouchableOpacity
                                onPress={() => navigation.navigate('PushComposer')}
                                style={{
                                    marginTop: SPACING.md,
                                    minHeight: 48,
                                    borderRadius: RADIUS.md,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: SPACING.sm,
                                    backgroundColor: currentTheme.colors.primary,
                                }}
                            >
                                <BellRing size={17} color={currentTheme.colors.background} />
                                <Text style={{ color: currentTheme.colors.background, fontSize: mScale(14), fontWeight: '800' }}>
                                    Compose Firebase Push
                                </Text>
                            </TouchableOpacity>
                        </Section>

                        <Section title="Active Dispatch Logs">
                            <DispatchLogCard logs={dispatchLogs} />
                        </Section>

                        <Section title="OTA Release Management">
                            <OtaUpdateCard
                                statusText={otaStatusText}
                                checkingOta={checkingOta}
                                installingOta={installingOta}
                                otaAvailable={otaAvailable}
                                onCheck={checkForOtaUpdate}
                                onInstall={installOtaUpdate}
                            />
                        </Section>

                        <Section title="Infrastructure Readiness">
                            <ConfigHealthCard health={health} />
                        </Section>
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
};
