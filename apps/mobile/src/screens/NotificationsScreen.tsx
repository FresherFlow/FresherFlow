import React, { memo, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { AlertDelivery, AlertKind } from '@fresherflow/types';
import { useTheme } from '@/contexts/ThemeContext';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { Screen } from '@/system/layout/Layout';
import { Zap, Clock, Layers, Star, Trash2, BellOff, ArrowRight } from 'lucide-react-native';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

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

const getAlertIcon = (kind: AlertKind, color: string) => {
    const size = 20;
    switch (kind) {
        case 'NEW_JOB': return <Zap size={size} color={color} />;
        case 'CLOSING_SOON': return <Clock size={size} color={color} />;
        case 'DAILY_DIGEST': return <Layers size={size} color={color} />;
        case 'HIGHLIGHT': return <Star size={size} color={color} />;
        default: return <BellOff size={size} color={color} />;
    }
};

const AlertRow = memo(({ 
    alert, 
    onPress, 
    onDelete 
}: { 
    alert: AlertDelivery; 
    onPress: (alert: AlertDelivery) => void;
    onDelete: (id: string) => void;
}) => {
    const { currentTheme } = useTheme();
    const swipeAnim = useRef(new Animated.Value(0)).current;
    
    const isUnread = !alert.readAt;

    const handleDelete = () => {
        Animated.timing(swipeAnim, {
            toValue: -500,
            duration: 300,
            useNativeDriver: true,
        }).start(() => onDelete(alert.id));
    };

    return (
        <Animated.View style={[
            styles.alertRowContainer,
            { transform: [{ translateX: swipeAnim }] }
        ]}>
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => onPress(alert)}
                style={[
                    styles.alertRow,
                    { 
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: alpha(currentTheme.colors.border, 0.3)
                    }
                ]}
            >
                <View style={styles.alertContent}>
                    <View style={[
                        styles.iconContainer, 
                        { backgroundColor: alpha(isUnread ? currentTheme.colors.primary : currentTheme.colors.textMuted, 0.1) }
                    ]}>
                        {getAlertIcon(alert.kind, isUnread ? currentTheme.colors.primary : currentTheme.colors.textMuted)}
                    </View>
                    
                    <View style={styles.textContainer}>
                        <View style={styles.rowTop}>
                            <Text 
                                style={[styles.alertTitle, { color: currentTheme.colors.text }]}
                                numberOfLines={1}
                            >
                                {alert.opportunity?.title || 'New Signal'}
                            </Text>
                            <Text style={[styles.timestamp, { color: currentTheme.colors.textMuted }]}>
                                {getRelativeTime(alert.sentAt)}
                            </Text>
                        </View>
                        
                        <Text 
                            style={[styles.alertSub, { color: currentTheme.colors.textMuted }]}
                            numberOfLines={1}
                        >
                            {alert.opportunity?.company || 'Check the latest updates'}
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
    const { currentTheme } = useTheme();
    const { alerts, unreadCount, loading, refreshing, markRead, markAllRead, deleteAlert, refresh } = useNotifications();

    const handleAlertPress = useCallback((alert: AlertDelivery) => {
        if (!alert.readAt) markRead(alert.id);
        
        if (alert.opportunity?.id) {
            navigation.navigate('JobDetail', { opportunityId: alert.opportunity.id });
        }
    }, [navigation, markRead]);

    const sections = useMemo(() => {
        const today: AlertDelivery[] = [];
        const yesterday: AlertDelivery[] = [];
        const older: AlertDelivery[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 86400000;

        alerts.forEach(alert => {
            const time = new Date(alert.sentAt).getTime();
            if (time >= startOfToday) today.push(alert);
            else if (time >= startOfYesterday) yesterday.push(alert);
            else older.push(alert);
        });

        return [
            { title: 'Today', data: today },
            { title: 'Yesterday', data: yesterday },
            { title: 'Older', data: older }
        ].filter(s => s.data.length > 0);
    }, [alerts]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                <BellOff size={48} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Signals Yet</Text>
            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                Complete your profile and keep an eye out for tailored job alerts.
            </Text>
            <TouchableOpacity 
                style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => navigation.navigate('Explore')}
            >
                <Text style={styles.exploreBtnText}>Explore Jobs</Text>
                <ArrowRight size={18} color="white" />
            </TouchableOpacity>
        </View>
    );

    return (
        <Screen safe={false}>
            <PremiumHeader 
                title="Signals" 
                subtitle="Your Alerts"
                rightSlot={unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={[styles.markAll, { color: currentTheme.colors.primary }]}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            />

            {loading && !refreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color={currentTheme.colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={sections}
                    keyExtractor={item => item.title}
                    renderItem={({ item }) => (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                                {item.title.toUpperCase()}
                            </Text>
                            {item.data.map(alert => (
                                <AlertRow 
                                    key={alert.id} 
                                    alert={alert} 
                                    onPress={handleAlertPress}
                                    onDelete={deleteAlert}
                                />
                            ))}
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    onRefresh={refresh}
                    refreshing={refreshing}
                    showsVerticalScrollIndicator={false}
                />
            )}
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
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.5,
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
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
    emptyTitle: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 15,
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
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    markAll: {
        fontSize: mScale(12),
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

export default memo(NotificationsScreen);
