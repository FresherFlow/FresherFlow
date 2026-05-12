import React, { memo, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    StatusBar,
    Platform,
    Switch,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { 
    Bell, 
    Mail, 
    Calendar, 
    Clock, 
    Globe
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { alertsApi } from '@fresherflow/api-client';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { getLocalAlertPrefs, saveLocalAlertPrefs } from '@/utils/localAlerts';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertSettings'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type AlertPreference = {
    enabled: boolean;
    emailEnabled: boolean;
    dailyDigest: boolean;
    closingSoon: boolean;
    minRelevanceScore: number;
    preferredHour: number;
    timezone: string;
};

const DEFAULT_PREFS: AlertPreference = {
    enabled: true,
    emailEnabled: true,
    dailyDigest: true,
    closingSoon: true,
    minRelevanceScore: 45,
    preferredHour: 8,
    timezone: 'Asia/Kolkata',
};

const AlertSettingsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const [prefs, setPrefs] = useState<AlertPreference>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);

    const loadPrefs = useCallback(async () => {
        setLoading(true);
        // Try local first for instant UI
        const local = await getLocalAlertPrefs();
        if (local) setPrefs(local);

        try {
            const response = await alertsApi.getPreferences() as { preference: AlertPreference };
            if (response.preference) {
                const merged = { ...DEFAULT_PREFS, ...response.preference };
                setPrefs(merged);
                void saveLocalAlertPrefs(merged);
            }
        } catch (error) {
            console.error('Failed to load alert preferences', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPrefs();
    }, [loadPrefs]);

    const updatePref = async (patch: Partial<AlertPreference>) => {
        const nextPrefs = { ...prefs, ...patch };
        setPrefs(nextPrefs);
        try {
            await alertsApi.updatePreferences(patch);
            void saveLocalAlertPrefs(nextPrefs);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Failed to update preferences', error);
            // Revert on error
            const current = await getLocalAlertPrefs();
            if (current) setPrefs(current);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
                <ActivityIndicator color={currentTheme.colors.primary} />
            </View>
        );
    }

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <SecondaryHeader 
                    title="Alert Settings" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.content}>
                    <View style={styles.heroSection}>
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Stay{'\n'}Updated.</Text>
                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                            Configure how and when you want to receive job alerts and updates.
                        </Text>
                    </View>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>CHANNELS</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <ToggleRow 
                            icon={Bell} 
                            label="Enable All Alerts" 
                            value={prefs.enabled}
                            onToggle={(v) => updatePref({ enabled: v })}
                            currentTheme={currentTheme}
                        />
                        <ToggleRow 
                            icon={Mail} 
                            label="Email Notifications" 
                            value={prefs.emailEnabled}
                            disabled={!prefs.enabled}
                            onToggle={(v) => updatePref({ emailEnabled: v })}
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>PREFERENCES</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <ToggleRow 
                            icon={Calendar} 
                            label="Daily Digest" 
                            value={prefs.dailyDigest}
                            disabled={!prefs.enabled || !prefs.emailEnabled}
                            onToggle={(v) => updatePref({ dailyDigest: v })}
                            currentTheme={currentTheme}
                        />
                        <ToggleRow 
                            icon={Clock} 
                            label="Closing Soon Alerts" 
                            value={prefs.closingSoon}
                            disabled={!prefs.enabled || !prefs.emailEnabled}
                            onToggle={(v) => updatePref({ closingSoon: v })}
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>ADVANCED</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <View style={styles.inputRow}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={[styles.rowLabel, { color: currentTheme.colors.text }]}>Min Relevance Score</Text>
                                <Text style={[styles.rowSub, { color: currentTheme.colors.textMuted }]}>Only alert if match {'>'} {prefs.minRelevanceScore}%</Text>
                            </View>
                            <TextInput 
                                style={[styles.input, { color: currentTheme.colors.primary, backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                value={String(prefs.minRelevanceScore)}
                                keyboardType="numeric"
                                onChangeText={(v) => setPrefs(p => ({ ...p, minRelevanceScore: Number(v) }))}
                                onBlur={() => updatePref({ minRelevanceScore: Math.max(0, Math.min(100, prefs.minRelevanceScore)) })}
                            />
                        </View>
                        <View style={[styles.inputRow, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }]}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={[styles.rowLabel, { color: currentTheme.colors.text }]}>Digest Hour (0-23)</Text>
                                <Text style={[styles.rowSub, { color: currentTheme.colors.textMuted }]}>Preferred delivery time</Text>
                            </View>
                            <TextInput 
                                style={[styles.input, { color: currentTheme.colors.primary, backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                value={String(prefs.preferredHour)}
                                keyboardType="numeric"
                                onChangeText={(v) => setPrefs(p => ({ ...p, preferredHour: Number(v) }))}
                                onBlur={() => updatePref({ preferredHour: Math.max(0, Math.min(23, prefs.preferredHour)) })}
                            />
                        </View>
                    </SurfaceCard>

                    <View style={styles.footerInfo}>
                         <Globe size={14} color={currentTheme.colors.textMuted} />
                         <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                            Timezone: {prefs.timezone}
                         </Text>
                    </View>
                </View>
            </ScrollView>
        </Screen>
    );
});

interface ToggleRowProps {
    icon: React.ElementType;
    label: string;
    value: boolean;
    disabled?: boolean;
    isLast?: boolean;
    currentTheme: AppTheme;
    onToggle: (v: boolean) => void;
}

const ToggleRow = ({ icon: Icon, label, value, disabled, isLast, currentTheme, onToggle }: ToggleRowProps) => (
    <View 
        style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.1) }]}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), opacity: disabled ? 0.5 : 1 }]}>
                <Icon size={18} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: currentTheme.colors.text, opacity: disabled ? 0.5 : 1 }]}>{label}</Text>
        </View>
        <Switch 
            value={value} 
            onValueChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(v);
            }}
            disabled={disabled}
            trackColor={{ false: alpha(currentTheme.colors.border, 0.5), true: currentTheme.colors.primary }}
        />
    </View>
);

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: { zIndex: 10 },
    scrollContent: { paddingBottom: 60 },
    content: { paddingHorizontal: 20 },
    heroSection: { marginTop: 20, marginBottom: 32 },
    heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 36 },
    heroSub: { fontSize: 15, marginTop: 12, lineHeight: 22 },
    groupLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 12, marginBottom: 12, marginTop: 32 },
    groupCard: { padding: 0, borderRadius: 28 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '800' },
    rowSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    inputLabelContainer: { flex: 1 },
    input: { width: 60, height: 40, borderRadius: 12, textAlign: 'center', fontWeight: '800', fontSize: 15 },
    footerInfo: { marginTop: 32, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 40 },
    footerText: { fontSize: 12, fontWeight: '700' }
});

export default AlertSettingsScreen;
