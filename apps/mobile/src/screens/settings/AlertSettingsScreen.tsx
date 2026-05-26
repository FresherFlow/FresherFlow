import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    ActivityIndicator,
    TextInput,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    Bell, 
    Clock, 
} from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useAlertSettings } from '@/hooks/useAlertSettings';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard, PremiumToggle } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertSettings'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AlertSettingsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const {
        loading,
        control,
        watch,
        updatePref,
    } = useAlertSettings();

    const enabled = watch('enabled');
    const minRelevanceScore = watch('minRelevanceScore');

    if (loading) {
        return (
            <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
                <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Alert Settings"
                        onBack={() => navigation.goBack()}
                    />
                </View>
                <View style={styles.center}>
                    <ActivityIndicator color={currentTheme.colors.primary} />
                </View>
            </Screen>
        );
    }

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                <SecondaryHeader
                    title="Alert Settings"
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: insets.bottom + 40 }]}
            >
                <View style={styles.content}>
                    <View style={styles.heroSection}>
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Stay{'\n'}Updated.</Text>
                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                            Configure how and when you want to receive job alerts and updates.
                        </Text>
                    </View>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Channels</Text>
                    <Controller
                        control={control}
                        name="enabled"
                        render={({ field: { value, onChange } }) => (
                            <PremiumToggle 
                                icon={Bell} 
                                title="Enable All Alerts" 
                                description="Receive push notifications for new matches"
                                value={value}
                                onValueChange={(v) => { onChange(v); updatePref({ enabled: v }); }}
                            />
                        )}
                    />

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Preferences</Text>
                    <Controller
                        control={control}
                        name="closingSoon"
                        render={({ field: { value, onChange } }) => (
                            <PremiumToggle 
                                icon={Clock} 
                                title="Closing Soon Alerts" 
                                description="Notify when deadlines are approaching"
                                value={value}
                                disabled={!enabled}
                                onValueChange={(v) => { onChange(v); updatePref({ closingSoon: v }); }}
                            />
                        )}
                    />

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Advanced</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <View style={[styles.inputRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.inputLabelContainer}>
                                <Text style={[styles.rowLabel, { color: currentTheme.colors.text }]}>Min Relevance Score</Text>
                                <Text style={[styles.rowSub, { color: currentTheme.colors.textMuted }]}>Only alert if match {'>'} {minRelevanceScore}%</Text>
                            </View>
                            <Controller
                                control={control}
                                name="minRelevanceScore"
                                render={({ field: { value, onChange } }) => (
                                    <TextInput 
                                        style={[styles.input, { color: currentTheme.colors.primary, backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                        value={String(value)}
                                        keyboardType="numeric"
                                        onChangeText={(v) => onChange(Number(v) || 0)}
                                        onBlur={() => {
                                            const val = Math.max(0, Math.min(100, Number(value) || 0));
                                            onChange(val);
                                            updatePref({ minRelevanceScore: val });
                                        }}
                                    />
                                )}
                            />
                        </View>
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Diagnostics</Text>
                    <TouchableOpacity 
                        style={[styles.testButton, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={async () => {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: "Test Match from FresherFlow",
                                    body: "If you see this, your push notifications are working perfectly locally.",
                                    sound: true,
                                    android: {
                                        channelId: 'matches',
                                        smallIcon: '@drawable/notification_icon',
                                        largeIcon: null,
                                    },
                                },
                                trigger: null, // Fire immediately
                            });
                        }}
                    >
                        <Text style={[styles.testButtonText, { color: currentTheme.colors.background }]}>
                            Test Push Notification
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </Screen>
    );
});


const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: { zIndex: 10 },
    scrollContent: { paddingBottom: 60 },
    content: { paddingHorizontal: 20 },
    heroSection: { marginTop: 20, marginBottom: 32 },
    heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 36 },
    heroSub: { fontSize: 15, marginTop: 12, lineHeight: 22 },
    groupLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 12, marginBottom: 12, marginTop: 32 },
    groupCard: { padding: 0, borderRadius: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '800' },
    rowSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    inputLabelContainer: { flex: 1 },
    input: { width: 60, height: 40, borderRadius: 12, textAlign: 'center', fontWeight: '800', fontSize: 15 },
    testButton: { marginTop: 8, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    testButtonText: { fontSize: 16, fontWeight: '800' },
    footerInfo: { marginTop: 32, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 40 },
    footerText: { fontSize: 12, fontWeight: '700' }
});

export default memo(AlertSettingsScreen);

