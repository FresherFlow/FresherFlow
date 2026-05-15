import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    StatusBar,
    Switch,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    Bell, 
    Clock, 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Controller } from 'react-hook-form';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useAlertSettings } from '@/hooks/useAlertSettings';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

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
            <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
                <ActivityIndicator color={currentTheme.colors.primary} />
            </View>
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
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.content}>
                    <View style={styles.heroSection}>
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Stay{'\n'}Updated.</Text>
                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                            Configure how and when you want to receive job alerts and updates.
                        </Text>
                    </View>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Channels</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <Controller
                            control={control}
                            name="enabled"
                            render={({ field: { value, onChange } }) => (
                                <ToggleRow 
                                    icon={Bell} 
                                    label="Enable All Alerts" 
                                    value={value}
                                    onToggle={(v) => { onChange(v); updatePref({ enabled: v }); }}
                                    currentTheme={currentTheme}
                                    isLast
                                />
                            )}
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Preferences</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <Controller
                            control={control}
                            name="closingSoon"
                            render={({ field: { value, onChange } }) => (
                                <ToggleRow 
                                    icon={Clock} 
                                    label="Closing Soon Alerts" 
                                    value={value}
                                    disabled={!enabled}
                                    onToggle={(v) => { onChange(v); updatePref({ closingSoon: v }); }}
                                    currentTheme={currentTheme}
                                    isLast
                                />
                            )}
                        />
                    </SurfaceCard>

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

export default memo(AlertSettingsScreen);

