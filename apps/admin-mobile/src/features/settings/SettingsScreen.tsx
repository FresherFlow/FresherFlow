import React, { useEffect } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Shield, Palette, Info, MessageSquare, Server, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { mScale, SPACING } from '../../theme/dimensions';
import { useSettings } from './hooks/useSettings';
import { useTotpManager } from '../security/hooks/useTotpManager';
import { useOtaManager } from '../system/hooks';
import { ProfileCard } from './components/ProfileCard';
import { SettingsCard, SettingItem, ChevronRight } from './components/SettingsComponents';
import { Screen, ScrollScreen, PremiumHeader } from '../system/layout/Layout';

type SettingsRouteName =
    | 'AppearanceSettings'
    | 'Security'
    | 'Feedback'
    | 'AppInfo'
    | 'OTAUpdates'
    | 'SystemOverview';

const SettingsScreen = () => {
    const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
    const { colors, currentTheme } = useTheme();
    const {
        admin,
        loading,
        refreshing,
        setRefreshing,
        fetchStatus,
        handleLogout,
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

    const totpSummary = totpState.isEnabled ? 'Enabled' : 'Not enabled';
    const updateSummary = otaState.statusText || `Version ${otaState.appVersion}`;

    return (
        <Screen>
            <ScrollScreen
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || loading}
                        onRefresh={() => {
                            void handleRefresh();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                <PremiumHeader title="Settings" subtitle="Admin configuration" />

                <ProfileCard admin={admin} colors={colors} onLogout={handleLogout} />

                <SettingsCard title="Account">
                    <SettingItem
                        title="Security"
                        description={`Two-factor auth: ${totpSummary}`}
                        customIcon={<Shield size={18} color={colors.primary} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('Security')}
                    />
                    <SettingItem
                        title="Appearance"
                        description={currentTheme.name}
                        customIcon={<Palette size={18} color={colors.accent} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('AppearanceSettings')}
                        isLast
                    />
                </SettingsCard>

                <SettingsCard title="Operations">
                    <SettingItem
                        title="System Health"
                        description="Queue health, config readiness, and alert controls"
                        customIcon={<Server size={18} color={colors.secondary} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('SystemOverview')}
                    />
                    <SettingItem
                        title="Feedback Inbox"
                        description="Review listing and app feedback"
                        customIcon={<MessageSquare size={18} color={colors.primary} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('Feedback')}
                    />
                    <SettingItem
                        title="OTA Updates"
                        description={updateSummary}
                        customIcon={<RefreshCw size={18} color={colors.warning} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('OTAUpdates')}
                    />
                    <SettingItem
                        title="App Information"
                        description={`Runtime ${otaState.runtimeVersion}`}
                        customIcon={<Info size={18} color={colors.textMuted} />}
                        renderControl={() => <ChevronRight />}
                        onPress={() => navigateTo('AppInfo')}
                        isLast
                    />
                </SettingsCard>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Admin mobile settings are organized as focused flows for operational efficiency.
                    </Text>
                </View>
            </ScrollScreen>
        </Screen>
    );
};

export { SettingsScreen };

const styles = StyleSheet.create({
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
    },
    footerText: {
        fontSize: mScale(11),
        lineHeight: mScale(16),
        textAlign: 'center',
        opacity: 0.6,
    },
});


