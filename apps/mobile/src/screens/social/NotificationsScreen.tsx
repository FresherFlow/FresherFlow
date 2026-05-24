import React, { memo, useMemo, useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '@/hooks/useNotifications';
import { saveDetailCache } from '@/utils/offlineCache';
import { LocalAlert, isProfileSetupComplete } from '@/utils/localNotifications';
import { getLocalProfile } from '@/utils/localProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { Screen } from '@/system/layout/Layout';
import { BellOff, ArrowRight, Trash2, Settings, Sparkles, Compass } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { toTitleCase } from '@/utils/text';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { Profile } from '@fresherflow/types';
import { useProfile } from '@/hooks/useProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

type NotificationListItem = 
    | { type: 'header'; title: string; key: string }
    | { type: 'alert'; alert: LocalAlert; key: string }
    | { type: 'nudge'; key: string }
    | { type: 'guest-nudge'; key: string };

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const sent = new Date(date);
    const diffInSecs = Math.floor((now.getTime() - sent.getTime()) / 1000);

    if (diffInSecs < 60) return 'just now';
    if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
    if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
    if (diffInSecs < 604800) return `${Math.floor(diffInSecs / 86400)}d ago`;
    return sent.toLocaleDateString();
};

const ProfileSetupNudge = memo(({ onComplete }: { onComplete: () => void }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[
            styles.nudgeCard,
            {
                backgroundColor: alpha(currentTheme.colors.primary, 0.04),
                borderColor: alpha(currentTheme.colors.primary, 0.15)
            }
        ]}>
            <View style={styles.nudgeRow}>
                <View style={[styles.nudgeIconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                    <Sparkles size={22} color={currentTheme.colors.primary} />
                </View>
                <View style={styles.nudgeTextContainer}>
                    <Text style={[styles.nudgeTitle, { color: currentTheme.colors.text }]}>
                        Unlock Personalized Match Scores 🎯
                    </Text>
                    <Text style={[styles.nudgeBody, { color: currentTheme.colors.textMuted }]}>
                        Complete your skills, education, and preferred cities to get personalized job matches and receive real-time updates.
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={onComplete}
                activeOpacity={0.8}
                style={[styles.nudgeButton, { backgroundColor: currentTheme.colors.primary }]}
            >
                <Text style={[styles.nudgeButtonText, { color: currentTheme.colors.background }]}>
                    Complete My Profile
                </Text>
                <ArrowRight size={16} color={currentTheme.colors.background} />
            </TouchableOpacity>
        </View>
    );
});

const GuestSetupNudge = memo(({ onRegister }: { onRegister: () => void }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[
            styles.nudgeCard,
            {
                backgroundColor: alpha(currentTheme.colors.primary, 0.04),
                borderColor: alpha(currentTheme.colors.primary, 0.15)
            }
        ]}>
            <View style={styles.nudgeRow}>
                <View style={[styles.nudgeIconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                    <Sparkles size={22} color={currentTheme.colors.primary} />
                </View>
                <View style={styles.nudgeTextContainer}>
                    <Text style={[styles.nudgeTitle, { color: currentTheme.colors.text }]}>
                        Unlock Personalized Match Scores 🎯
                    </Text>
                    <Text style={[styles.nudgeBody, { color: currentTheme.colors.textMuted }]}>
                        Create an account to get personalized job matches, real-time job alerts, and view your match scores.
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={onRegister}
                activeOpacity={0.8}
                style={[styles.nudgeButton, { backgroundColor: currentTheme.colors.primary }]}
            >
                <Text style={[styles.nudgeButtonText, { color: currentTheme.colors.background }]}>
                    Create Account / Sign In
                </Text>
                <ArrowRight size={16} color={currentTheme.colors.background} />
            </TouchableOpacity>
        </View>
    );
});

const AlertRow = memo(({
    alert,
    onPress,
    onDelete
}: {
    alert: LocalAlert;
    onPress: (alert: LocalAlert) => void;
    onDelete: (id: string) => void;
}) => {
    const { currentTheme } = useTheme();
    const swipeAnim = useRef(new Animated.Value(0)).current;

    const isUnread = !alert.readAt;

    const handleDelete = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.timing(swipeAnim, {
            toValue: -500,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onDelete(alert.id));
    };

    const handlePress = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(alert);
    };

    return (
        <Animated.View style={[
            styles.alertRowContainer,
            { transform: [{ translateX: swipeAnim }] }
        ]}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePress}
                style={[
                    styles.alertRow,
                    {
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: alpha(currentTheme.colors.border, 0.3)
                    }
                ]}
            >
                <View style={styles.alertContent}>
                    <View style={styles.logoContainer}>
                        <CompanyLogo
                            name={alert.opportunity.company}
                            logoUrl={alert.opportunity.companyLogoUrl}
                            website={alert.opportunity.companyWebsite}
                            size={44}
                        />
                        {isUnread && (
                            <View style={[styles.unreadBadge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.surface }]} />
                        )}
                    </View>

                    <View style={styles.textContainer}>
                        <View style={styles.rowTop}>
                            <Text
                                style={[styles.alertTitle, { color: currentTheme.colors.text }]}
                                numberOfLines={1}
                            >
                                {alert.opportunity.title}
                            </Text>
                            <Text style={[styles.timestamp, { color: currentTheme.colors.textMuted }]}>
                                {getRelativeTime(alert.sentAt)}
                            </Text>
                        </View>

                        <Text
                            style={[styles.alertSub, { color: currentTheme.colors.textMuted }]}
                            numberOfLines={1}
                        >
                            {alert.opportunity.company} · {toTitleCase(alert.opportunity.locations?.[0] || 'Remote')} · Posted {getRelativeTime(alert.opportunity.postedAt || alert.sentAt)}
                        </Text>

                        {/* Match Score Badge */}
                        {alert.opportunity.matchScore !== undefined && alert.opportunity.matchScore > 0 && (
                            <View style={styles.badgeRow}>
                                <View style={[
                                    styles.pillBadge,
                                    { backgroundColor: alpha(currentTheme.colors.success, 0.08) }
                                ]}>
                                    <Sparkles size={11} color={currentTheme.colors.success} style={{ marginRight: 4 }} />
                                    <Text style={[styles.pillText, { color: currentTheme.colors.success }]}>
                                        {alert.opportunity.matchScore}% Match
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* AI Match Insights */}
                        {alert.opportunity.matchReason && (
                            <View style={[
                                styles.insightContainer,
                                { borderTopColor: alpha(currentTheme.colors.border, 0.05) }
                            ]}>
                                <Text 
                                    style={[styles.insightText, { color: currentTheme.colors.textMuted }]}
                                    numberOfLines={2}
                                >
                                    💡 {alert.opportunity.matchReason}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.deleteBtn}
                >
                    <Trash2 size={16} color={currentTheme.colors.error} />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
});

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { alerts, unreadCount, refreshing, markRead, markAllRead, deleteAlert, refresh } = useNotifications();
    const [profile, setProfile] = useState<Profile | null>(null);
    const { user } = useProfile();
    const isAnonymous = !user || user.isAnonymous;

    const loadProfile = useCallback(async () => {
        const p = await getLocalProfile();
        setProfile(p);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadProfile();
        }, [loadProfile])
    );

    const isSetup = useMemo(() => isProfileSetupComplete(profile), [profile]);

    const handleAlertPress = useCallback((alert: LocalAlert) => {
        if (!alert.readAt) markRead(alert.id);
        void saveDetailCache(alert.opportunity);
        navigation.navigate('JobDetail', { opportunity: alert.opportunity, opportunityId: alert.opportunity.id });
    }, [navigation, markRead]);

    const flattenedData = useMemo(() => {
        const today: LocalAlert[] = [];
        const yesterday: LocalAlert[] = [];
        const older: LocalAlert[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 86400000;

        alerts.forEach(alert => {
            const time = new Date(alert.sentAt).getTime();
            if (time >= startOfToday) today.push(alert);
            else if (time >= startOfYesterday) yesterday.push(alert);
            else older.push(alert);
        });

        const result: NotificationListItem[] = [];

        // Insert profile incomplete nudge or guest login nudge at the very top of alerts
        if (isAnonymous) {
            result.push({ type: 'guest-nudge', key: 'guest-nudge' });
        } else if (!isSetup) {
            result.push({ type: 'nudge', key: 'profile-nudge' });
        }

        if (today.length > 0) {
            result.push({ type: 'header', title: 'Today', key: 'header-today' });
            today.forEach(a => result.push({ type: 'alert', alert: a, key: a.id }));
        }
        if (yesterday.length > 0) {
            result.push({ type: 'header', title: 'Yesterday', key: 'header-yesterday' });
            yesterday.forEach(a => result.push({ type: 'alert', alert: a, key: a.id }));
        }
        if (older.length > 0) {
            result.push({ type: 'header', title: 'Older', key: 'header-older' });
            older.forEach(a => result.push({ type: 'alert', alert: a, key: a.id }));
        }

        return result;
    }, [alerts, isSetup, isAnonymous]);

    const handleCompleteProfileNudge = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('CareerProfile');
    }, [navigation]);

    const handleRegister = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Auth');
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: NotificationListItem }) => {
        if (item.type === 'nudge') {
            return <ProfileSetupNudge onComplete={handleCompleteProfileNudge} />;
        }
        if (item.type === 'guest-nudge') {
            return <GuestSetupNudge onRegister={handleRegister} />;
        }
        if (item.type === 'header') {
            return (
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                    {item.title}
                </Text>
            );
        }
        return (
            <AlertRow
                alert={item.alert}
                onPress={handleAlertPress}
                onDelete={deleteAlert}
            />
        );
    }, [currentTheme, handleAlertPress, deleteAlert, handleCompleteProfileNudge, handleRegister]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                <BellOff size={44} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No New Opportunities</Text>
            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                {isAnonymous 
                    ? "Sign in or create an account to get personalized recommendations and receive real-time job alerts."
                    : "Newly detected jobs matching your profile credentials will appear here."}
            </Text>
            <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (isAnonymous) {
                        navigation.navigate('Auth');
                    } else {
                        navigation.navigate('Explore');
                    }
                }}
            >
                {isAnonymous ? (
                    <>
                        <Sparkles size={18} color={currentTheme.colors.background} />
                        <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>Create Account</Text>
                    </>
                ) : (
                    <>
                        <Compass size={18} color={currentTheme.colors.background} />
                        <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>Explore Feed</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const handleClearAll = () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        markAllRead();
    };

    return (
        <Screen safe={false}>
            <View style={{ paddingTop: insets.top + 10 }}>
                <PremiumHeader
                    title="Alerts"
                    subtitle="Newly Detected Jobs"
                    showBack
                    rightSlot={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('AlertSettings')}
                                style={{ padding: 8 }}
                            >
                                <Settings size={22} color={currentTheme.colors.primary} />
                            </TouchableOpacity>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                                    <Text style={[styles.markAll, { color: currentTheme.colors.primary }]}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            </View>

            <FlashList<NotificationListItem>
                data={flattenedData}
                keyExtractor={item => item.key}
                renderItem={renderItem}
                getItemType={item => item.type}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={100}
                initialNumToRender={15}
                drawDistance={500}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={refresh} />
                }
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.sectionTitle,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    alertRowContainer: {
        width: '100%',
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        elevation: 1,
        shadowColor: 'rgba(0, 0, 0, 0.04)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
    },
    alertContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    logoContainer: {
        marginRight: SPACING.md,
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    rowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertTitle: {
        fontSize: mScale(14.5),
        flex: 1,
        marginRight: SPACING.sm,
    },
    timestamp: {
        fontSize: mScale(11),
        fontWeight: '500',
    },
    alertSub: {
        fontSize: mScale(12.5),
        fontWeight: '500',
        marginTop: 2,
    },
    unreadBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 11,
        height: 11,
        borderRadius: 5.5,
        borderWidth: 1.8,
    },
    deleteBtn: {
        padding: SPACING.md,
        marginLeft: SPACING.xs,
        alignSelf: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        ...TYPOGRAPHY.h2,
        marginBottom: 8,
    },
    emptySub: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    exploreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        elevation: 2,
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    exploreBtnText: {
        fontWeight: '800',
        fontSize: 15,
        letterSpacing: 0.5,
    },
    markAll: {
        fontSize: mScale(13),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    clearBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    // Nudge Card Styling
    nudgeCard: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    nudgeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    nudgeIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    nudgeTextContainer: {
        flex: 1,
    },
    nudgeTitle: {
        fontSize: mScale(14),
        fontWeight: '800',
        marginBottom: 4,
    },
    nudgeBody: {
        fontSize: mScale(12),
        fontWeight: '500',
        lineHeight: 18,
    },
    nudgeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: SPACING.md,
        paddingVertical: 11,
        borderRadius: 12,
    },
    nudgeButtonText: {
        fontSize: mScale(13),
        fontWeight: '800',
    },
    // Badge pill styling
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pillText: {
        fontSize: mScale(10.5),
        fontWeight: '600',
    },
    // Insight matching text
    insightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    insightText: {
        fontSize: mScale(11),
        fontWeight: '500',
        flex: 1,
    }
});

export default memo(NotificationsScreen);
