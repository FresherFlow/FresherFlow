import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    Mail, 
    ChevronRight,
    ShieldCheck,
    FileText,
    Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useProfile } from '@/hooks/useProfile';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountManage'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AccountManageScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { user } = useProfile();
    


    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                <SecondaryHeader 
                    title="Account" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            >
                <View style={styles.content}>
                    <View style={styles.heroSection}>
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Safe &{'\n'}Secure.</Text>
                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                            Manage your professional identity and data privacy.
                        </Text>
                    </View>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Identity</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={Mail} 
                            label="Email Address" 
                            value={user?.email || 'Guest Explorer'}
                            currentTheme={currentTheme}
                        />
                        <SettingRow 
                            icon={ShieldCheck} 
                            label="Privacy & Data" 
                            value="Manage your visibility"
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Legal & Compliance</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={FileText} 
                            label="Terms of Service" 
                            currentTheme={currentTheme}
                            onPress={() => navigation.navigate('Legal')}
                        />
                        <SettingRow 
                            icon={ShieldCheck} 
                            label="Privacy Policy" 
                            currentTheme={currentTheme}
                            onPress={() => navigation.navigate('Legal')}
                            isLast
                        />
                    </SurfaceCard>

                    <View style={styles.footerInfo}>
                        <Info size={16} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                            FresherFlow v1.0.4 (Production Build)
                        </Text>
                    </View>
                </View>
            </ScrollView>


        </Screen>
    );
});

interface SettingRowProps {
    icon: React.ElementType;
    label: string;
    value?: string;
    isLast?: boolean;
    currentTheme: AppTheme;
    destructive?: boolean;
    onPress?: () => void;
}

const SettingRow = ({ icon: Icon, label, value, isLast, currentTheme, destructive, onPress }: SettingRowProps) => (
    <TouchableOpacity 
        style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.05) }]}
        onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress?.();
        }}
        activeOpacity={0.7}
        disabled={!onPress}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.text, 0.04) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.text} strokeWidth={2} />
            </View>
            <View>
                <Text style={[styles.rowLabel, { color: destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>{label}</Text>
                {value && <Text style={[styles.rowValue, { color: currentTheme.colors.textMuted }]}>{value}</Text>}
            </View>
        </View>
        {onPress && <ChevronRight size={14} color={alpha(currentTheme.colors.textMuted, 0.3)} strokeWidth={3} />}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingTop: 12,
    },
    content: {
        paddingHorizontal: 20,
    },
    heroSection: {
        marginTop: 20,
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 36,
    },
    heroSub: {
        fontSize: 15,
        marginTop: 12,
        lineHeight: 22,
        fontWeight: '500',
    },
    groupLabel: {
        ...TYPOGRAPHY.label,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 32,
    },
    groupCard: {
        padding: 0,
        borderRadius: 28,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    rowValue: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    footerInfo: {
        marginTop: 60,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});

export default memo(AccountManageScreen);

