import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    BarChart3,
    Clock,
    MessageSquare,
    MousePointerClick,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react-native';
import { ANALYTICS_DAY_OPTIONS, useAnalytics } from './hooks/useAnalytics';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    MetricCard, 
    SurfaceCard 
} from '../system/components/SpecializedCards';
import { 
    DetailRow, 
    MetricGrid 
} from './components/Metrics';
import { 
    EmptyState 
} from '../feedback/components/Feedback';
import { 
    ScrollScreen, 
    Section,
    PremiumHeader,
} from '../system/layout/Layout';
import { SegmentedControl } from '../system/components/Controls';

const ChannelBar = ({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.channelRow}>
            <Text style={[styles.channelLabel, { color: colors.text }]}>{label}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { width: `${Math.max(pct, pct > 0 ? 6 : 0)}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.channelPct, { color: colors.textMuted }]}>{pct}%</Text>
            <Text style={[styles.channelValue, { color: colors.textMuted }]}>{value}</Text>
        </View>
    );
};

export const AnalyticsScreen = () => {
    const { colors, spacing } = useTheme();
    const {
        data,
        activity,
        loading,
        selectedDays,
        fetchAll,
        getPct,
    } = useAnalytics();

    useFocusEffect(useCallback(() => {
        void fetchAll(selectedDays);
    }, [fetchAll, selectedDays]));



    if (loading) {
        return (
            <View style={[styles.loader, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!data) {
        return (
            <ScrollScreen style={{ backgroundColor: colors.background }}>
                <EmptyState title="No analytics yet" message="Once events start flowing, this redesigned analytics view will populate automatically." />
            </ScrollScreen>
        );
    }

    const channel = data.channelAttribution;
    const activityMetrics = data.activity;
    const windowDays = data.windowDays ?? selectedDays;

    return (
        <ScrollScreen
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
        >
            <PremiumHeader title="Analytics" subtitle="Platform metrics" />

            <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                    <SegmentedControl
                        options={ANALYTICS_DAY_OPTIONS.map((days) => ({ label: `${days}D`, value: String(days) }))}
                        selectedValue={String(selectedDays)}
                        onChange={(value) => void fetchAll(Number(value))}
                    />
                </View>
                <Text style={[styles.windowText, { color: colors.textMuted }]}>{windowDays}d</Text>
            </View>

            <Section title="User activity">
                <MetricGrid>
                    <MetricCard label="New users" value={activityMetrics?.newUsers30d ?? 0} icon={<Users size={16} color={colors.primary} />} />
                    <MetricCard label="Apply clicks" value={data.clicks?.applyClicks30d ?? 0} icon={<MousePointerClick size={16} color={colors.accent} />} accent={colors.accent} />
                    <MetricCard label="Bookmarks" value={activityMetrics?.bookmarks7d ?? 0} icon={<TrendingUp size={16} color={colors.success} />} accent={colors.success} />
                    <MetricCard label="Signups" value={activityMetrics?.signupSuccess30d ?? 0} icon={<Zap size={16} color={colors.warning} />} accent={colors.warning} />
                </MetricGrid>
            </Section>

            <Section title="Retention and conversion">
                <SurfaceCard>
                    <DetailRow label="Daily active users" value={activityMetrics?.dau ?? 0} />
                    <DetailRow label="Active users in selected window" value={activityMetrics?.wau ?? 0} />
                    <DetailRow label="Returning users" value={activityMetrics?.returningUsers7d ?? 0} tone="positive" />
                    <DetailRow label="Returning rate" value={`${activityMetrics?.returningRate7d ?? 0}%`} />
                    <DetailRow label="Signup conversion" value={`${activityMetrics?.signupConversionRate30d ?? 0}%`} tone="positive" />
                </SurfaceCard>
            </Section>

            <Section title="Traffic sources">
                <SurfaceCard>
                    <ChannelBar label="Telegram" value={channel?.telegram ?? 0} pct={getPct(channel?.telegram ?? 0)} color="#229ED9" />
                    <ChannelBar label="WhatsApp" value={channel?.whatsapp ?? 0} pct={getPct(channel?.whatsapp ?? 0)} color="#25D366" />
                    <ChannelBar label="LinkedIn" value={channel?.linkedin ?? 0} pct={getPct(channel?.linkedin ?? 0)} color="#0A66C2" />
                    <ChannelBar label="Others" value={channel?.others ?? 0} pct={getPct(channel?.others ?? 0)} color={colors.textMuted} />
                </SurfaceCard>
            </Section>

            <Section title="Top clicked opportunities">
                {data.clicks?.topClickedOpportunities?.length ? (
                    <SurfaceCard style={{ paddingVertical: 0 }}>
                        {data.clicks.topClickedOpportunities.slice(0, 6).map((job, index) => (
                            <View
                                key={job.opportunityId}
                                style={[
                                    styles.rankRow,
                                    index < data.clicks!.topClickedOpportunities.slice(0, 6).length - 1 && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.rankValue, { color: colors.primary }]}>#{index + 1}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rankTitle, { color: colors.text }]} numberOfLines={1}>{job.title}</Text>
                                    <Text style={[styles.rankSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{job.company}</Text>
                                </View>
                                <Text style={[styles.rankClicks, { color: colors.text }]}>{job.clicks}</Text>
                            </View>
                        ))}
                    </SurfaceCard>
                ) : (
                    <EmptyState title="No click leaders yet" message="Top opportunities will appear here when the selected window has enough click data." />
                )}
            </Section>

            <Section title="Feedback signals">
                {Object.keys(data.feedback ?? {}).length ? (
                    <SurfaceCard style={{ paddingVertical: 0 }}>
                        {Object.entries(data.feedback ?? {})
                            .sort(([, a], [, b]) => Number(b) - Number(a))
                            .slice(0, 6)
                            .map(([reason, count], index, rows) => (
                                <View
                                    key={reason}
                                    style={[
                                        styles.rankRow,
                                        index < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                    ]}
                                >
                                    <MessageSquare size={15} color={colors.primary} />
                                    <Text style={[styles.feedbackReason, { color: colors.text }]}>{reason.replace(/_/g, ' ')}</Text>
                                    <Text style={[styles.rankClicks, { color: colors.primary }]}>{count}</Text>
                                </View>
                            ))}
                    </SurfaceCard>
                ) : (
                    <EmptyState title="No feedback trends" message="Listing feedback counts will show up here when users start reporting issues." />
                )}
            </Section>

            <Section title="Recent registrations">
                {activity?.users?.length ? (
                    <SurfaceCard style={{ paddingVertical: 0 }}>
                        {activity.users.map((user, index) => (
                            <View
                                key={user.id}
                                style={[
                                    styles.rankRow,
                                    index < activity.users!.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                ]}
                            >
                                <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}>
                                    <Text style={[styles.avatarText, { color: colors.primary }]}>{(user.fullName || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rankTitle, { color: colors.text }]}>{user.fullName || 'Unknown user'}</Text>
                                    <Text style={[styles.rankSubtitle, { color: colors.textMuted }]}>{user.email}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Clock size={14} color={colors.textMuted} />
                                    <Text style={[styles.rankSubtitle, { color: colors.textMuted }]}>
                                        {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </SurfaceCard>
                ) : (
                    <EmptyState title="No recent registrations" message="Newly created users will appear here." />
                )}
            </Section>

            <Section title="Urgent watchlist">
                <MetricGrid>
                    <MetricCard label="Closing in 48h" value={data.urgent?.closingSoon48h ?? 0} icon={<BarChart3 size={16} color={colors.warning} />} accent={colors.warning} />
                    <MetricCard label="Broken links" value={data.urgent?.brokenLinks ?? 0} icon={<TrendingUp size={16} color={colors.error} />} accent={colors.error} />
                </MetricGrid>
            </Section>
        </ScrollScreen>
    );
};

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    windowText: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 32,
        textAlign: 'right',
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    channelLabel: {
        width: 78,
        fontSize: 13,
        fontWeight: '700',
    },
    barTrack: {
        flex: 1,
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 999,
    },
    channelPct: {
        width: 34,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: '700',
    },
    channelValue: {
        width: 40,
        textAlign: 'right',
        fontSize: 12,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rankValue: {
        width: 28,
        fontSize: 14,
        fontWeight: '800',
    },
    rankTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    rankSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    rankClicks: {
        fontSize: 14,
        fontWeight: '800',
    },
    feedbackReason: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
});


