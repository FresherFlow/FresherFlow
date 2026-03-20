import React, { useEffect } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Shield, Sparkles, Info, MessageSquare, Server, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from './hooks/useSettings';
import { useTotpManager } from '../security/hooks/useTotpManager';
import { useOtaManager } from '../system/hooks';
import { ProfileCard } from './components/ProfileCard';
import { SettingsCard, SettingItem, ChevronRight } from './components/SettingsComponents';

type SettingsRouteName =
    | 'AppearanceSettings'
    | 'Security'
    | 'Feedback'
    | 'AppInfo'
    | 'OTAUpdates'
    | 'SystemOverview';

const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { colors, currentTheme, spacing } = useTheme();
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
        initTotp(Boolean(admin?.totpEnabled), admin?.totpEnabledAt ?? null);
    }, [admin?.totpEnabled, admin?.totpEnabledAt, initTotp]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStatus();
    };

    const navigateTo = (routeName: SettingsRouteName) => {
        navigation.navigate(routeName);
    };

    const isLightTheme = currentTheme.mode === 'light';
    const totpSummary = totpState.isEnabled ? 'Enabled' : 'Not enabled';
    const updateSummary = otaState.statusText || `Version ${otaState.appVersion}`;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isLightTheme ? 'dark-content' : 'light-content'} />

            <ScrollView
                contentContainerStyle={{
                    paddingTop: spacing.sm,
                    paddingBottom: insets.bottom + spacing.xl,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || loading}
                        onRefresh={() => {
                            void handleRefresh();
                        }}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
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
                        customIcon={<Sparkles size={18} color={colors.accent} />}
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
                        Admin mobile settings are now organized as a thin overview screen that routes into focused flows.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

export { SettingsScreen };

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    footerText: {
        fontSize: 12,
        lineHeight: 18,
    },
});


