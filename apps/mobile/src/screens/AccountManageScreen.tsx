import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import { 
    Mail, 
    ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountManage'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AccountManageScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const { user } = useAuth();



    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <SecondaryHeader 
                    title="Security" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.content}>
                    <View style={styles.heroSection}>
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Safe &{'\n'}Secure.</Text>
                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                            Your professional data is encrypted and private. Manage your credentials and privacy settings here.
                        </Text>
                    </View>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>CREDENTIALS</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={Mail} 
                            label="Email Address" 
                            value={user?.email || 'N/A'}
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>
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
        style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.1) }]}
        onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress?.();
        }}
        activeOpacity={0.7}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.text, 0.05) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.text} />
            </View>
            <View>
                <Text style={[styles.rowLabel, { color: destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>{label}</Text>
                {value && <Text style={[styles.rowValue, { color: currentTheme.colors.textMuted }]}>{value}</Text>}
            </View>
        </View>
        <ChevronRight size={16} color={currentTheme.colors.textMuted} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8,
    },
    scrollContent: {
        paddingBottom: 60,
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
    },
    groupLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
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
        padding: 20,
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
        fontWeight: '800',
    },
    rowValue: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    footerInfo: {
        marginTop: 48,
        alignItems: 'center',
        gap: 12,
        paddingBottom: 40,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    }
});

export default memo(AccountManageScreen);
