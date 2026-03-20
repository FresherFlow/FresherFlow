import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    AlertTriangle,
    ArrowRight,
    Briefcase,
    Eye,
    MousePointerClick,
    Plus,
    RefreshCw,
    TrendingUp,
    Users,
} from 'lucide-react-native';
import { DASHBOARD_WINDOW_OPTIONS, useDashboard } from './hooks/useDashboard';
import { alpha } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from '../../navigation/types';
import { 
    AppButton 
} from '@repo/ui';
import { 
    SurfaceCard, 
    MetricCard 
} from '../system/components/SpecializedCards';
import { 
    Screen, 
    ScrollScreen, 
    Section,
} from '../system/layout/Layout';
import { SegmentedControl } from '../system/components/Controls';
import { MetricGrid, DetailRow } from '../analytics/components/Metrics';
import { EmptyState } from '../feedback/components/Feedback';

const timeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const actionTone = (action: string) => {
    if (action.includes('DELETE') || action.includes('EXPIR')) return 'negative' as const;
    if (action.includes('PUBLISH') || action.includes('RESTOR')) return 'positive' as const;
    return 'default' as const;
};

export const DashboardScreen = () => {
    const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamList>>();

    const { colors, spacing, sizes, typography } = useTheme();
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

    return (
        <Screen>
            <ScrollScreen
                contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
                style={{ backgroundColor: colors.background }}
            >

                <View style={styles.topBar}>
                    <View style={{ flex: 1 }}>
                        <SegmentedControl
                            options={DASHBOARD_WINDOW_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                            selectedValue={selectedWindow}
                            onChange={(value) => void fetchDashboard(value)}
                        />
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <AppButton
                        label="Post New Opportunity"
                        onPress={() => navigation.navigate('Opportunities', { screen: 'PostOpportunity', params: {} })}
                        icon={<Plus size={10} color={colors.background} />}
                        style={{ flex: 1 }}
                    />
                    <AppButton
                        label="Refresh"
                        onPress={onRefresh}
                        variant="secondary"
                        icon={<RefreshCw size={16} color={colors.text} />}
                        style={{ flex: 1 }}
                    />
                </View>

                {(loading && !metrics) ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : (
                    <>
                        {error ? (
                            <SurfaceCard style={{ marginTop: spacing.lg, borderColor: alpha(colors.error, 0.3) }}>
                                <Text style={{ color: colors.error, fontWeight: '700' }}>{error}</Text>
                            </SurfaceCard>
                        ) : null}

                        <Section
                            title="Opportunity health"
                            action={
                                <TouchableOpacity onPress={() => navigation.navigate('Opportunities')}>
                                    <Text style={[typography.footnoteStrong, { color: colors.primary }]}>See all</Text>
                                </TouchableOpacity>
                            }
                        >
                            <MetricGrid>
                                <MetricCard label="Published" value={listings?.published ?? 0} icon={<Briefcase size={sizes.icon.md} color={colors.primary} />} />
                                <MetricCard label="Live" value={listings?.live ?? 0} icon={<Eye size={sizes.icon.md} color={colors.accent} />} accent={colors.accent} />
                                <MetricCard label="Drafts" value={listings?.drafts ?? 0} icon={<Briefcase size={sizes.icon.md} color={colors.warning} />} accent={colors.warning} />
                                <MetricCard label="New in 24h" value={listings?.new24h ?? 0} icon={<TrendingUp size={sizes.icon.md} color={colors.success} />} accent={colors.success} />
                            </MetricGrid>
                        </Section>

                        <Section title="Users and conversion">
                            <MetricGrid>
                                <MetricCard label="New users" value={traffic?.newUsers30d ?? 0} icon={<Users size={sizes.icon.md} color={colors.primary} />} />
                                <MetricCard label="DAU" value={traffic?.dau ?? 0} icon={<TrendingUp size={sizes.icon.md} color={colors.success} />} accent={colors.success} />
                                <MetricCard label="WAU / active window" value={traffic?.wau ?? 0} icon={<Users size={sizes.icon.md} color={colors.accent} />} accent={colors.accent} />
                                <MetricCard label="Apply clicks" value={funnel?.applyClick ?? 0} icon={<MousePointerClick size={sizes.icon.md} color={colors.warning} />} accent={colors.warning} />
                            </MetricGrid>
                        </Section>

                        <Section title="Operational highlights">
                            <SurfaceCard>
                                <DetailRow label="Healthy links" value={metrics?.linkHealth?.healthy ?? 0} tone="positive" />
                                <DetailRow label="Retrying links" value={metrics?.linkHealth?.retrying ?? 0} />
                                <DetailRow label="Broken links" value={metrics?.linkHealth?.broken ?? 0} tone="negative" />
                                <DetailRow label="Detail views" value={funnel?.detailView ?? 0} />
                                <DetailRow label="Auth success" value={funnel?.authSuccess ?? 0} tone="positive" />
                            </SurfaceCard>
                        </Section>

                        <Section title="Recent listings">
                            {metrics?.recentListings?.length ? (
                                <SurfaceCard>
                                    {metrics.recentListings.map((item: { id: string; company: string; title: string; type: string; postedAt: string }, index: number) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.listingRow,
                                                index < (metrics.recentListings?.length ?? 0) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                            ]}
                                            onPress={() => navigation.navigate('Opportunities', { screen: 'OpportunityDetail', params: { opportunityId: item.id } })}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[typography.subheadlineStrong, { color: colors.text }]} numberOfLines={1}>{item.company}</Text>
                                                <Text style={[typography.footnote, { color: colors.textMuted }]} numberOfLines={1}>{item.title}</Text>
                                            </View>
                                            <View style={styles.listingMeta}>
                                                <Text style={[typography.footnoteStrong, { color: colors.text }]}>{item.type}</Text>
                                                <Text style={[typography.caption2, { color: colors.textMuted }]}>{timeSince(item.postedAt)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </SurfaceCard>
                            ) : (
                                <EmptyState title="No recent listings" message="Fresh listings will show up here as admins publish them." />
                            )}
                        </Section>

                        <Section title="Recent admin activity">
                            {recentActivity.length ? (
                                <SurfaceCard>
                                    {recentActivity.map((item: { id: string; action: string; entity: string; createdAt: string }, index: number) => (
                                        <View
                                            key={item.id}
                                            style={[
                                                styles.activityRow,
                                                index < recentActivity.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                            ]}
                                        >
                                            <View style={[styles.activityDot, { backgroundColor: actionTone(item.action) === 'positive' ? colors.success : actionTone(item.action) === 'negative' ? colors.error : colors.primary }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[typography.footnoteStrong, { color: colors.text }]}>{item.action.replace(/_/g, ' ')}</Text>
                                                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>{item.entity}</Text>
                                            </View>
                                            <Text style={[typography.caption2, { color: colors.textMuted }]}>{timeSince(item.createdAt)}</Text>
                                        </View>
                                    ))}
                                </SurfaceCard>
                            ) : (
                                <EmptyState title="No recent activity" message="New admin actions will appear here once the team starts publishing or editing." />
                            )}
                        </Section>

                        <Section title="Actions">
                            <View style={styles.actionStack}>
                                <AppButton
                                    label="Open analytics"
                                    onPress={() => navigation.navigate('Analytics')}
                                    variant="ghost"
                                    icon={<ArrowRight size={sizes.icon.md} color={colors.primary} />}
                                />
                                <AppButton
                                    label="Review system health"
                                    onPress={() => navigation.navigate('Ops')}
                                    variant="secondary"
                                    icon={<AlertTriangle size={sizes.icon.md} color={colors.text} />}
                                />
                            </View>
                        </Section>
                    </>
                )}
            </ScrollScreen>
        </Screen>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginTop: 18,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    listingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    listingMeta: {
        alignItems: 'flex-end',
        gap: 2,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    activityDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    actionStack: {
        gap: 12,
    },
});


