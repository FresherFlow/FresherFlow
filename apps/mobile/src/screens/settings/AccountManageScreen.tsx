import React, { memo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal } from 'react-native';
import { 
    Mail, 
    ChevronRight,
    UserCircle,
    LogOut,
    Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/useAuthStore';

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
    const logout = useAuthStore(state => state.logout);
    const firebaseUser = useAuthStore(state => state.firebaseUser);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const onLogoutPress = () => {
        setShowLogoutModal(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleConfirmLogout = async () => {
        setShowLogoutModal(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await logout();
        navigation.goBack();
    };



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
                    <View style={[
                        styles.profileHeader, 
                        { 
                            backgroundColor: alpha(currentTheme.colors.surface, 0.5),
                            borderColor: alpha(currentTheme.colors.border, 0.1) 
                        }
                    ]}>
                        {firebaseUser?.photoURL ? (
                            <Image 
                                source={{ uri: firebaseUser.photoURL }} 
                                style={[styles.avatar, { borderColor: alpha(currentTheme.colors.primary, 0.3) }]} 
                            />
                        ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                <UserCircle size={32} color={currentTheme.colors.primary} />
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: currentTheme.colors.text }]}>
                                {user?.fullName || firebaseUser?.displayName || 'Guest Explorer'}
                            </Text>
                            <Text style={[styles.profileEmail, { color: currentTheme.colors.textMuted }]}>
                                {user?.email || firebaseUser?.email || 'Sign in to sync your profile'}
                            </Text>
                        </View>
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
                            icon={UserCircle} 
                            label="Public Handle" 
                            value={user?.username ? `@${user.username}` : 'Not set'}
                            currentTheme={currentTheme}
                            onPress={user?.username ? undefined : () => navigation.navigate('ProfileChooseUsername')}
                            isLast
                        />
                    </SurfaceCard>

                    {!(!user || user.isAnonymous) && (
                        <>
                            <Text style={[styles.groupLabel, { color: currentTheme.colors.error }]}>Account Actions</Text>
                            <SurfaceCard style={styles.groupCard}>
                                <SettingRow 
                                    icon={LogOut} 
                                    label="Sign Out" 
                                    currentTheme={currentTheme}
                                    destructive
                                    onPress={onLogoutPress}
                                    isLast
                                />
                            </SurfaceCard>
                        </>
                    )}

                    <View style={styles.footerInfo}>
                        <Info size={16} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                            FresherFlow v{Constants.expoConfig?.version || '1.0.0'} (Production Build)
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showLogoutModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLogoutModal(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: currentTheme.colors.blackOverlay }]}>
                    <SurfaceCard style={styles.modalContent}>
                        <View style={[styles.modalIconBox, { backgroundColor: alpha(currentTheme.colors.error, 0.05) }]}>
                            <LogOut size={28} color={currentTheme.colors.error} />
                        </View>
                        <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Sign Out</Text>
                        <Text style={[styles.modalSub, { color: currentTheme.colors.textMuted }]}>
                            Are you sure you want to log out? You'll need to sign in again to access your profile.
                        </Text>
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: currentTheme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: currentTheme.colors.error }]}
                                onPress={handleConfirmLogout}
                            >
                                <Text style={[styles.modalBtnText, { color: currentTheme.colors.inverseText }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </SurfaceCard>
                </View>
            </Modal>


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
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 24,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
    },
    avatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        marginLeft: 16,
        flex: 1,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    profileEmail: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    groupLabel: {
        ...TYPOGRAPHY.label,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 32,
    },
    groupCard: {
        padding: 0,
        borderRadius: 16,
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
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        padding: 32,
        alignItems: 'center',
        borderRadius: 32,
    },
    modalIconBox: {
        width: 64,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 12,
    },
    modalSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        fontWeight: '500',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnText: {
        fontSize: 15,
        fontWeight: '800',
    }
});

export default memo(AccountManageScreen);

