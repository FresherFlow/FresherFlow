import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { 
    Shield, 
    UserCheck, 
    MessageSquare, 
    History, 
    Info, 
    Palette, 
    Moon, 
    Sun, 
    Activity, 
    ChevronRight, 
    Fingerprint, 
    Lock,
    Eye,
    Server,
    Cpu,
    Smartphone
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS, mScale } from '../../theme/dimensions';
import { Screen } from '../../components/common/Layout';
import { 
    SurfaceCard, 
    PremiumHeader, 
    AppText, 
    PremiumToggle 
} from '../../components/common/PremiumPrimitives';

export default function SettingsScreen() {
    const { currentTheme, themeMode, isAmoled, setThemeMode, toggleAmoled } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();

    // Client-side local preferences
    const [biometricsEnabled, setBiometricsEnabled] = useState(true);
    const [requirePin, setRequirePin] = useState(false);
    const [auditLogAlerts, setAuditLogAlerts] = useState(true);

    const triggerHapticLight = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleNavigationShortcut = async (tabName: string, screenName?: string) => {
        await triggerHapticLight();
        if (screenName) {
            navigation.navigate(tabName, { screen: screenName });
        } else {
            navigation.navigate(tabName);
        }
    };

    const toggleThemeMode = async () => {
        const nextMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
        setThemeMode(nextMode);
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Settings" 
                subtitle="System Control Center" 
                showBack={false} 
            />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. SECURITY PREFERENCES */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        Security Configuration
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <PremiumToggle
                            title="Biometric Login"
                            description="Use Face ID Or Fingerprint Authenticator"
                            value={biometricsEnabled}
                            onValueChange={(val) => {
                                triggerHapticLight();
                                setBiometricsEnabled(val);
                            }}
                            icon={Fingerprint}
                        />
                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                        <PremiumToggle
                            title="Require Pin"
                            description="Force Pin Screen On Application Cold Boot"
                            value={requirePin}
                            onValueChange={(val) => {
                                triggerHapticLight();
                                setRequirePin(val);
                            }}
                            icon={Lock}
                        />
                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={() => {
                                triggerHapticLight();
                                navigation.navigate('AccountSettings');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <Shield size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">Account Security</AppText>
                                    <AppText variant="badge" muted>2FA & Passkeys Configuration</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>
                    </SurfaceCard>
                </View>

                {/* CONTENT MANAGEMENT */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        Content Management
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={() => {
                                triggerHapticLight();
                                navigation.navigate('Resources');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <Server size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">Manage Resources</AppText>
                                    <AppText variant="badge" muted>Review & Approve Shared Resources</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>
                    </SurfaceCard>
                </View>

                {/* 2. VETTING PORTAL SHORTCUTS */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        Vetting Portal Shortcuts
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={() => handleNavigationShortcut('Moderation', 'Submissions')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <UserCheck size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">User Vetting Portal</AppText>
                                    <AppText variant="badge" muted>Process Verification Applications</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />

                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={() => handleNavigationShortcut('Moderation', 'Feedback')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <MessageSquare size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">Live Comments Moderator</AppText>
                                    <AppText variant="badge" muted>Audit Feedback And Comment Queue</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />

                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={() => {
                                triggerHapticLight();
                                navigation.navigate('Users');
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <UserCheck size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">Registered Users</AppText>
                                    <AppText variant="badge" muted>Manage Student Profiles</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>
                    </SurfaceCard>
                </View>

                {/* 3. MODERATION LOGS */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        Moderation Logs
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={async () => {
                                await triggerHapticLight();
                                // Place navigation or feedback action here if needed
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <History size={20} color={currentTheme.colors.primary} />
                                </View>
                                <View>
                                    <AppText variant="label">View Audit Trail</AppText>
                                    <AppText variant="badge" muted>Track Coordinator Account Activities</AppText>
                                </View>
                            </View>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />

                        <PremiumToggle
                            title="System Events Alert"
                            description="Push Alert For Severe Moderation Events"
                            value={auditLogAlerts}
                            onValueChange={(val) => {
                                triggerHapticLight();
                                setAuditLogAlerts(val);
                            }}
                            icon={Activity}
                        />
                    </SurfaceCard>
                </View>

                {/* 4. APPEARANCE CONTROLS */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        Appearance Settings
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            style={styles.rowItem}
                            onPress={toggleThemeMode}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    {themeMode === 'light' ? (
                                        <Sun size={20} color={currentTheme.colors.primary} />
                                    ) : (
                                        <Moon size={20} color={currentTheme.colors.primary} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <AppText variant="label">Active Theme Mode</AppText>
                                    <AppText variant="badge" muted>Current Theme Choice</AppText>
                                </View>
                            </View>
                            <View style={styles.badgeWrapper}>
                                <AppText 
                                    variant="badge" 
                                    primary 
                                    style={[
                                        styles.premiumThemeBadge, 
                                        { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }
                                    ]}
                                >
                                    {themeMode.toUpperCase()}
                                </AppText>
                            </View>
                        </TouchableOpacity>

                        {themeMode !== 'light' && (
                            <>
                                <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                                <PremiumToggle
                                    title="Amoled Black Mode"
                                    description="Enable Pitch Black Dark Screens"
                                    value={isAmoled}
                                    onValueChange={(val) => {
                                        toggleAmoled(val);
                                    }}
                                    icon={Palette}
                                />
                            </>
                        )}
                    </SurfaceCard>
                </View>

                {/* 5. APP INFO */}
                <View style={styles.sectionContainer}>
                    <AppText variant="sectionTitle" style={styles.sectionHeader}>
                        App Information
                    </AppText>
                    <SurfaceCard 
                        style={[
                            styles.card, 
                            { 
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                                borderWidth: 0.5,
                                borderRadius: RADIUS.lg,
                                backgroundColor: currentTheme.colors.surface
                            }
                        ]}
                    >
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <Smartphone size={18} color={currentTheme.colors.textMuted} />
                                <AppText variant="body" muted>App Version</AppText>
                            </View>
                            <AppText variant="label">1.0.0 (Gold Master)</AppText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <Cpu size={18} color={currentTheme.colors.textMuted} />
                                <AppText variant="body" muted>Build Number</AppText>
                            </View>
                            <AppText variant="label">2026.05.28</AppText>
                        </View>
                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoLeft}>
                                <Server size={18} color={currentTheme.colors.textMuted} />
                                <AppText variant="body" muted>Server Node Connection</AppText>
                            </View>
                            <AppText variant="label" style={{ color: currentTheme.colors.success }}>CONNECTED</AppText>
                        </View>
                    </SurfaceCard>
                </View>

                <View style={{ height: SPACING.xl }} />
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 120 : 90,
    },
    sectionContainer: {
        marginBottom: SPACING.lg,
    },
    sectionHeader: {
        marginBottom: SPACING.sm,
        fontSize: mScale(13),
        letterSpacing: 1.0,
        textTransform: 'uppercase',
    },
    card: {
        padding: 0,
        overflow: 'hidden',
    },
    divider: {
        height: 0.5,
        width: '100%',
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    iconWrapper: {
        width: mScale(36),
        height: mScale(36),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumThemeBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.sm,
        fontWeight: 'bold',
        fontSize: mScale(10),
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    }
});
