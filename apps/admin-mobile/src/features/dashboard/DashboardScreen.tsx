import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    AlertTriangle,
    ArrowRight,
    Briefcase,
    Eye,
    MousePointerClick,
    TrendingUp,
    Users,
} from 'lucide-react-native';
import { DASHBOARD_WINDOW_OPTIONS, useDashboard } from './hooks/useDashboard';
import { useTheme } from '../../theme/ThemeProvider';
import { mScale, SPACING } from '../../theme/dimensions';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminTabParamList, AdminStackParamList } from '../../navigation/types';

type DashboardNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<AdminTabParamList, 'Home'>,
    NativeStackNavigationProp<AdminStackParamList>
>;
import { HeroCard, MetricCard } from '../system/components/SpecializedCards';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { Screen, Section } from '../system/layout/Layout';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { SegmentedControl } from '../system/components/Controls';
import { alpha } from '../../theme';

const timeSince = (dateString: string) => {
    if (!dateString) return '—';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

const actionTone = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('EXPIR')) return 'negative';
    if (act.includes('PUBLISH') || act.includes('RESTOR')) return 'positive';
    return 'default';
};

export const DashboardScreen = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { colors } = useTheme().currentTheme;
    const {
        metrics,
        recentActivity,
        selectedWindow,
        loading,
        error,
        fetchDashboard,
    } = useDashboard();

    useFocusEffect(useCallback(() => {
        void fetchDashboard(selectedWindow);
    }, [fetchDashboard, selectedWindow]));

    const onRefresh = useCallback(() => {
        void fetchDashboard(selectedWindow);
    }, [fetchDashboard, selectedWindow]);

    const listings = metrics?.listings;
    const traffic = metrics?.traffic;
    const funnel = metrics?.funnel;
    const recentListings = metrics?.recentListings || [];

    return (
        <Screen safe={true}>
            <SimpleHeader title="Platform Metrics" />
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={loading} 
                        onRefresh={onRefresh} 
                        tintColor={colors.primary} 
                    />
                }
            >
                <View style={styles.topBar}>
                    <View style={styles.segmentedWrapper}>
                        <SegmentedControl
                            options={DASHBOARD_WINDOW_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                            selectedValue={selectedWindow}
                            onChange={(value) => void fetchDashboard(value)}
                        />
                    </View>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Settings')}
                        style={styles.settingsBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <SettingsIcon size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {error && (
                    <SurfaceCard style={[styles.errorCard, { borderColor: alpha(colors.error, 0.2) }]}>
                        <AlertTriangle size={18} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    </SurfaceCard>
                )}

                {loading && !metrics ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <>
                        <Section 
                            title="Signal Pulse"
                            action={
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Signals')}
                                    style={styles.seeAllBtn}
                                >
                                    <Text style={[styles.seeAllText, { color: colors.primary }]}>
                                        Feed
                                    </Text>
                                    <ArrowRight size={12} color={colors.primary} />
                                </TouchableOpacity>
                            }
                        >
                        <Animated.View entering={FadeInDown.delay(100).springify()}>
                            <HeroCard 
                                title="Platform Volume" 
                                subtitle="Real-time listing activity"
                                accent={colors.primary}
                            >
                                <View style={styles.metricGrid}>
                                    <MetricCard 
                                        label="Published" 
                                        value={listings?.published ?? 0} 
                                        icon={<Briefcase size={16} color={colors.primary} />} 
                                    />
                                    <MetricCard 
                                        label="Live Jobs" 
                                        value={listings?.live ?? 0} 
                                        icon={<Eye size={16} color={colors.success} />} 
                                        accent={colors.success}
                                    />
                                    <MetricCard 
                                        label="Drafts" 
                                        value={listings?.drafts ?? 0} 
                                        icon={<Briefcase size={16} color={colors.warning} />} 
                                        accent={colors.warning}
                                    />
                                    <MetricCard 
                                        label="Growth (24h)" 
                                        value={listings?.new24h ?? 0} 
                                        icon={<TrendingUp size={16} color={colors.info} />} 
                                        accent={colors.info}
                                    />
                                </View>
                            </HeroCard>
                        </Animated.View>
                        </Section>

                        <Section 
                            title="Community Signal"
                            action={
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Submissions')}
                                    style={styles.seeAllBtn}
                                >
                                    <Text style={[styles.seeAllText, { color: colors.primary }]}>
                                        Reviews
                                    </Text>
                                    <ArrowRight size={12} color={colors.primary} />
                                </TouchableOpacity>
                            }
                        >
                        <Animated.View entering={FadeInDown.delay(250).springify()}>
                            <View style={styles.metricGrid}>
                                <MetricCard 
                                    label="Pending Submissions" 
                                    value={listings?.pendingSubmissions ?? 0} 
                                    icon={<Users size={16} color={colors.warning} />} 
                                    accent={colors.warning}
                                    onPress={() => navigation.navigate('Submissions')}
                                />
                            </View>
                        </Animated.View>
                        </Section>

                        <Section title="Growth Metrics">
                            <View style={styles.metricGrid}>
                                <MetricCard 
                                    label="New Signups" 
                                    value={traffic?.newUsers30d ?? 0} 
                                    icon={<Users size={16} color={colors.primary} />} 
                                />
                                <MetricCard 
                                    label="Active DAU" 
                                    value={traffic?.dau ?? 0} 
                                    icon={<TrendingUp size={16} color={colors.success} />} 
                                    accent={colors.success}
                                />
                                <MetricCard 
                                    label="Conversion Intent" 
                                    value={funnel?.applyClick ?? 0} 
                                    icon={<MousePointerClick size={16} color={colors.warning} />} 
                                    accent={colors.warning}
                                />
                            </View>
                        </Section>

                        <Section title="Latest Listings">
                            {recentListings.length > 0 && (
                                <SurfaceCard style={styles.listCard}>
                                    {recentListings.map((item: { id: string; company: string; title: string; type: string; postedAt: string }, index: number) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.listItem,
                                                index < (recentListings?.length || 0) - 1 && [styles.listBorder, { borderBottomColor: colors.surfaceMuted }]
                                            ]}
                                            onPress={() => navigation.navigate('Signals', { screen: 'OpportunityDetail', params: { opportunityId: item.id } } as never)}
                                        >
                                            <View style={styles.itemMain}>
                                                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                                                    {item.company}
                                                </Text>
                                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                                                    {item.title}
                                                </Text>
                                            </View>
                                            <View style={styles.itemMeta}>
                                                <Text style={[styles.itemBadge, { color: colors.primary }]}>
                                                    {item.type}
                                                </Text>
                                                <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                                                    {timeSince(item.postedAt)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </SurfaceCard>
                            )}
                        </Section>

                        <Section title="System Events">
                            {recentActivity.length > 0 && (
                                <SurfaceCard style={styles.listCard}>
                                    {recentActivity.map((item: { id: string; action: string; entity: string; createdAt: string }, index: number) => {
                                        const tone = actionTone(item.action);
                                        const toneColor = tone === 'positive' ? colors.success : tone === 'negative' ? colors.error : colors.primary;
                                        
                                        return (
                                            <View
                                                key={item.id}
                                                style={[
                                                    styles.listItem,
                                                    index < recentActivity.length - 1 && [styles.listBorder, { borderBottomColor: colors.surfaceMuted }]
                                                ]}
                                            >
                                                <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
                                                <View style={styles.itemMain}>
                                                    <Text style={[styles.itemTitle, { color: colors.text, fontSize: mScale(14) }]}>
                                                        {item.action?.replace(/_/g, ' ')}
                                                    </Text>
                                                    <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                                                        {item.entity}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                                                    {timeSince(item.createdAt)}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </SurfaceCard>
                            )}
                        </Section>

                    </>
                )}
            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 140,
        paddingTop: SPACING.md,
    },
    refreshBtn: {
        padding: 4,
    },
    settingsBtn: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(150,150,150,0.2)',
    },
    topBar: {
        flexDirection: 'row',
        gap: SPACING.md,
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    segmentedWrapper: {
        flex: 1,
    },
    postBtn: {
        height: mScale(44),
        paddingHorizontal: SPACING.lg,
        borderRadius: 12,
    },
    loadingWrapper: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
        borderWidth: 1,
    },
    errorText: {
        fontSize: mScale(14),
        fontWeight: '600',
        flex: 1,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1,
    },
    metricGrid: {
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    metricRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    listCard: {
        padding: 0,
        overflow: 'hidden',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        gap: SPACING.md,
    },
    listBorder: {
        borderBottomWidth: 1,
    },
    itemMain: {
        flex: 1,
    },
    itemTitle: {
        fontSize: mScale(15),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    itemSubtitle: {
        fontSize: mScale(12),
        fontWeight: '500',
        marginTop: 2,
    },
    itemMeta: {
        alignItems: 'flex-end',
        gap: 4,
    },
    itemBadge: {
        fontSize: mScale(9),
        fontWeight: '900',
    },
    itemTime: {
        fontSize: mScale(10),
        fontWeight: '700',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    halfBtn: {
        flex: 1,
    }
});
