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
import { useFeedStore } from '@/store/useFeedStore';
import { getLogoCacheKey } from '@/utils/cache/syncModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard, PremiumToggle, PremiumToggleGroup } from '@/system/components/PremiumPrimitives';

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

    const privateJobs = watch('privateJobs');
    const governmentJobs = watch('governmentJobs');
    const enabled = privateJobs || governmentJobs;
    const minRelevanceScore = watch('minRelevanceScore');

    if (loading) {
        return (
            <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
                <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Alert Settings"
                        onBack={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('Main' as never);
                            }
                        }}
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
                    onBack={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('Main' as never);
                        }
                    }}
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
                    <PremiumToggleGroup>
                        <Controller
                            control={control}
                            name="privateJobs"
                            render={({ field: { value, onChange } }) => (
                                <PremiumToggle 
                                    icon={Bell} 
                                    title="Private Jobs" 
                                    description="Receive push alerts for top tech and corporate roles"
                                    value={value}
                                    position="first"
                                    onValueChange={(v) => { onChange(v); updatePref({ privateJobs: v }); }}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="governmentJobs"
                            render={({ field: { value, onChange } }) => (
                                <PremiumToggle 
                                    icon={Bell} 
                                    title="Government Jobs" 
                                    description="Receive push alerts for SSC, UPSC, Banking, etc"
                                    value={value}
                                    position="last"
                                    onValueChange={(v) => { onChange(v); updatePref({ governmentJobs: v }); }}
                                />
                            )}
                        />
                    </PremiumToggleGroup>

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
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                            style={[styles.testButton, { backgroundColor: currentTheme.colors.primary, flex: 1 }]}
                            onPress={async () => {
                                await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title: "System Test",
                                        body: "Basic push notifications are working.",
                                        sound: true,
                                        android: { channelId: 'matches' },
                                    } as any,
                                    trigger: null,
                                });
                            }}
                        >
                            <Text style={[styles.testButtonText, { color: currentTheme.colors.background }]}>
                                Basic Push
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.testButton, { backgroundColor: currentTheme.colors.text, flex: 1 }]}
                            onPress={async () => {
                                const jobs = useFeedStore.getState().cachedItems || [];
                                let job: (typeof jobs[0] & { matchScore?: number }) | null = null;
                                if (jobs.length > 0) {
                                    job = jobs[Math.floor(Math.random() * Math.min(10, jobs.length))];
                                }
                                
                                const matchScore = job?.matchScore || 95;
                                const title = job ? `${job.title} (${matchScore}% Match)` : `Frontend Developer (${matchScore}% Match)`;
                                const company = job ? job.company : `Arattai`;
                                const body = `${company} is hiring. Your profile strongly matches this role.`;
                                
                                let cachedLogo = null;
                                if (job) {
                                    try {
                                        cachedLogo = await AsyncStorage.getItem(`logo_${getLogoCacheKey(job)}`);
                                    } catch (e) {}
                                }
                                const largeIcon = cachedLogo || `https://ui-avatars.com/api/?name=${company}&background=random&color=fff&size=256`;

                                await Notifications.scheduleNotificationAsync({
                                    content: {
                                        title,
                                        body,
                                        sound: true,
                                        data: { type: 'new_job', opportunityId: job?.id || 'test-123' },
                                        android: { 
                                            channelId: 'matches',
                                            largeIcon,
                                        },
                                    } as any,
                                    trigger: null,
                                });
                            }}
                        >
                            <Text style={[styles.testButtonText, { color: currentTheme.colors.background }]}>
                                Job Push
                            </Text>
                        </TouchableOpacity>
                    </View>

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
    testButton: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    testButtonText: { fontSize: 14, fontWeight: '800' },
    footerInfo: { marginTop: 32, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 40 },
    footerText: { fontSize: 12, fontWeight: '700' }
});

export default memo(AlertSettingsScreen);

