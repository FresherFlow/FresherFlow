import React, { memo, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '@/hooks/useNotifications';
import { saveDetailCache } from '@/utils/offlineCache';
import { LocalAlert } from '@/utils/localNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { Screen } from '@/system/layout/Layout';
import { BellOff, ArrowRight, Trash2, Settings } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { toTitleCase } from '@/utils/text';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

type NotificationListItem = 
    | { type: 'header'; title: string; key: string }
    | { type: 'alert'; alert: LocalAlert; key: string };

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
                            {alert.opportunity.company} · {toTitleCase(alert.opportunity.locations[0])}
                        </Text>
                    </View>

                    {isUnread && (
                        <View style={[styles.unreadDot, { backgroundColor: currentTheme.colors.primary }]} />
                    )}
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

    const handleAlertPress = useCallback((alert: LocalAlert) => {
        if (!alert.readAt) markRead(alert.id);

        void saveDetailCache(alert.opportunity);
        navigation.navigate('JobDetail', { opportunity: alert.opportunity, opportunityId: alert.opportunity.id });
    }, [navigation, markRead]);

    // Initial hydration is handled by useNotifications on mount

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
    }, [alerts]);

    const renderItem = useCallback(({ item }: { item: NotificationListItem }) => {
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
    }, [currentTheme, handleAlertPress, deleteAlert]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                <BellOff size={48} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No New Opportunities</Text>
            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                Newly detected jobs that match your profile will appear here.
            </Text>
            <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('Explore');
                }}
            >
                <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>Explore Feed</Text>
                <ArrowRight size={18} color={currentTheme.colors.background} />
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
                                <TouchableOpacity onPress={handleClearAll}>
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
                estimatedItemSize={80}
                initialNumToRender={15}
                drawDistance={500}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmpty}
                onRefresh={refresh}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: SPACING.xl,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        ...TYPOGRAPHY.sectionTitle,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
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
        marginBottom: SPACING.xs,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
    },
    alertContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        marginRight: SPACING.md,
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
        fontSize: mScale(15),
        fontWeight: '700',
        flex: 1,
        marginRight: SPACING.sm,
    },
    timestamp: {
        fontSize: mScale(11),
        fontWeight: '500',
    },
    alertSub: {
        fontSize: mScale(13),
        fontWeight: '500',
        marginTop: 2,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: SPACING.sm,
    },
    deleteBtn: {
        padding: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    typeBadgeText: {
        ...TYPOGRAPHY.badge,
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
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
    },
    exploreBtnText: {
        fontWeight: '700',
        fontSize: 16,
    },
    markAll: {
        fontSize: mScale(13),
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});

export default memo(NotificationsScreen);
