import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Alert,
} from 'react-native';
import { 
    Mail, 
    Lock, 
    Bell, 
    Trash2, 
    ChevronRight,
    Shield,
    Smartphone
} from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountManage'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AccountManageScreen: React.FC<Props> = memo(() => {
    const { currentTheme } = useTheme();
    const { user } = useAuth();

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is permanent and will delete all your professional data. Proceed?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete Permanently", style: "destructive", onPress: () => console.log("Account deletion requested") }
            ]
        );
    };

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <PremiumHeader 
                    title="Account" 
                    subtitle="Security & Preferences" 
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.container}>
                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>CREDENTIALS</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={Mail} 
                            label="Email Address" 
                            value={user?.email || 'N/A'}
                            currentTheme={currentTheme}
                        />
                        <SettingRow 
                            icon={Lock} 
                            label="Change Security Code" 
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>COMMUNICATION</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={Bell} 
                            label="Push Notifications" 
                            value="Enabled"
                            currentTheme={currentTheme}
                        />
                        <SettingRow 
                            icon={Smartphone} 
                            label="Marketing SMS" 
                            value="Disabled"
                            currentTheme={currentTheme}
                            isLast
                        />
                    </SurfaceCard>

                    <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>PRIVACY & DATA</Text>
                    <SurfaceCard style={styles.groupCard}>
                        <SettingRow 
                            icon={Shield} 
                            label="Profile Visibility" 
                            value="Public"
                            currentTheme={currentTheme}
                        />
                        <SettingRow 
                            icon={Trash2} 
                            label="Request Data Deletion" 
                            currentTheme={currentTheme}
                            isLast
                            destructive
                            onPress={handleDeleteAccount}
                        />
                    </SurfaceCard>

                    <View style={styles.infoArea}>
                        <Text style={[styles.infoText, { color: currentTheme.colors.textMuted }]}>
                            Identity linked to {user?.email || 'this device'}.
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
        style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.3) }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.primary, 0.05) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.primary} />
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
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
    },
    container: {
        paddingHorizontal: 20,
    },
    groupLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 24,
    },
    groupCard: {
        padding: 0,
        borderRadius: 24,
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
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    rowValue: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    infoArea: {
        marginTop: 40,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        fontWeight: '500',
    }
});

export default AccountManageScreen;
