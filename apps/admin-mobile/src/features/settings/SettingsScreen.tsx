import React, { useEffect } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Shield, Palette, Info, MessageSquare, Server, RefreshCw, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { mScale, SPACING } from '../../theme/dimensions';
import { useSettings } from './hooks/useSettings';
import { useTotpManager } from '../security/hooks/useTotpManager';
import { useOtaManager } from '../system/hooks';
import { SettingsCard, SettingItem, ChevronRight } from './components/SettingsComponents';
import { ScrollScreen, Section } from '../system/layout/Layout';

type SettingsRouteName =
    | 'AppearanceSettings'
    | 'Dashboard'
    | 'Security'
    | 'Feedback'
    | 'AppInfo'
    | 'OTAUpdates'
    | 'TelegramBroadcasts'
    | 'SocialPosts'
    | 'SystemOverview'
    | 'ThemeSettings';

const SettingsScreen = () => {
    const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
    const { currentTheme } = useTheme();
    const {
        admin,
        loading,
        refreshing,
        setRefreshing,
        fetchStatus,
    } = useSettings();
    const { state: otaState } = useOtaManager();
    const { state: totpState, init: initTotp } = useTotpManager();

    useEffect(() => {
        void fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        initTotp(Boolean(admin?.totpEnabled), admin?.totpEnabledAt ? new Date(admin.totpEnabledAt).toISOString() : null);
    }, [admin?.totpEnabled, admin?.totpEnabledAt, initTotp]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStatus();
    };

    const navigateTo = (routeName: SettingsRouteName) => {
        navigation.navigate(routeName);
    };

    const totpSummary = totpState.isEnabled ? 'Enabled' : 'Disabled';
    const updateSummary = otaState.statusText || `v${otaState.appVersion}`;

    return (
        <ScrollScreen
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || loading}
                        onRefresh={() => {
                            void handleRefresh();
                        }}
                        tintColor={currentTheme.colors.primary}
                    />
                }
            >
                <Section title="Account & Security">
                    <SettingsCard>
                        <SettingItem
                            title="Security"
                            description={`Two-factor authentication is ${totpSummary.toLowerCase()}`}
                            customIcon={<Shield size={18} color={currentTheme.colors.primary} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('Security')}
                        />
                        <SettingItem
                            title="Appearance"
                            description={currentTheme.name}
                            customIcon={<Palette size={18} color={currentTheme.colors.secondary} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('ThemeSettings')}
                            isLast
                        />
                    </SettingsCard>
                </Section>

                <Section title="Operations">
                    <SettingsCard>
                        <SettingItem
                            title="Dashboard Metrics"
                            description="Operational overview and signals"
                            customIcon={<TrendingUp size={18} color={currentTheme.colors.primary} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('Dashboard')}
                            isLast
                        />
                    </SettingsCard>
                </Section>

                <Section title="System & Infrastructure">
                    <SettingsCard>
                        <SettingItem
                            title="System Health"
                            description="Infrastructure monitoring and alerts"
                            customIcon={<Server size={18} color={currentTheme.colors.primary} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('SystemOverview')}
                        />
                        <SettingItem
                            title="Feedback Queue"
                            description="Review platform signal accuracy"
                            customIcon={<MessageSquare size={18} color={currentTheme.colors.secondary} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('Feedback')}
                        />
                        <SettingItem
                            title="OTA Updates"
                            description={updateSummary}
                            customIcon={<RefreshCw size={18} color={currentTheme.colors.warning} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('OTAUpdates')}
                        />
                        <SettingItem
                            title="App Information"
                            description={`Runtime version ${otaState.runtimeVersion}`}
                            customIcon={<Info size={18} color={currentTheme.colors.textMuted} />}
                            renderControl={() => <ChevronRight />}
                            onPress={() => navigateTo('AppInfo')}
                            isLast
                        />
                    </SettingsCard>
                </Section>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                        Administrative operations are high-signal. Use caution when modifying system states.
                    </Text>
                </View>
            </ScrollScreen>
    );
};

export { SettingsScreen };

const styles = StyleSheet.create({
    scrollContent: { 
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
        paddingTop: SPACING.md,
    },
    footer: {
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.xl,
    },
    footerText: {
        fontSize: mScale(11),
        fontWeight: '600',
        lineHeight: mScale(16),
        textAlign: 'center',
        opacity: 0.5,
    },
});
