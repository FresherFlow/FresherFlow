import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Users, MousePointerClick, TrendingUp,
    MessageSquare, Zap, BarChart3, Clock,
} from 'lucide-react-native';

import { theme } from '../theme';
import { useAnalyticsScreen } from '../hooks/useAnalyticsScreen';

// Components
import { KpiCard, KpiGrid } from '../components/analytics/KpiGrid';
import { UrgentBanner } from '../components/analytics/UrgentBanner';

export const AnalyticsScreen = () => {
    const {
        data,
        activity,
        loading,
        refreshing,
        setRefreshing,
        fetchAll,
        getPct
    } = useAnalyticsScreen();

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!data) {
        return (
            <ScrollView 
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={[styles.center, { paddingTop: 100 }]}>
                    <Text style={styles.emptyText}>No analytics data</Text>
                </View>
            </ScrollView>
        );
    }

    const a = data.activity;
    const ch = data.channelAttribution;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
            <UrgentBanner closingSoon={data.urgent?.closingSoon48h} brokenLinks={data.urgent?.brokenLinks} />

            <SectionTitle icon={<Users size={15} color={theme.colors.primary} />} title="User Activity (30d)" />
            <KpiGrid>
                <KpiCard label="DAU" value={a?.dau ?? 0} accent={theme.colors.primary} />
                <KpiCard label="WAU" value={a?.wau ?? 0} accent={theme.colors.secondary} />
                <KpiCard label="Returning (7d)" value={a?.returningRate7d ?? 0} suffix="%" accent={theme.colors.success} />
                <KpiCard label="New Users" value={a?.newUsers30d ?? 0} accent={theme.colors.accent} />
                <KpiCard label="Signups" value={a?.signupSuccess30d ?? 0} accent={theme.colors.primary} />
                <KpiCard label="Signup CVR" value={a?.signupConversionRate30d ?? 0} suffix="%" accent={theme.colors.success} />
            </KpiGrid>

            <SectionTitle icon={<MousePointerClick size={15} color={theme.colors.primary} />} title="Apply Clicks (30d)" />
            <KpiGrid>
                <KpiCard label="Total Clicks" value={data.clicks?.applyClicks30d ?? 0} accent={theme.colors.primary} />
                <KpiCard label="Unique Users" value={data.clicks?.uniqueUserClickers30d ?? 0} accent={theme.colors.secondary} />
                <KpiCard label="Anon Sessions" value={data.clicks?.uniqueAnonSessions30d ?? 0} accent={theme.colors.textMuted} />
                <KpiCard label="Bookmarks (7d)" value={a?.bookmarks7d ?? 0} accent={theme.colors.accent} />
            </KpiGrid>

            {/* Top clicked jobs */}
            {(data.clicks?.topClickedOpportunities?.length ?? 0) > 0 && (
                <>
                    <SectionTitle icon={<TrendingUp size={15} color={theme.colors.primary} />} title="Top Clicked Opportunities" />
                    <View style={styles.card}>
                        {data.clicks!.topClickedOpportunities.slice(0, 6).map((job: any, idx: number) => (
                            <View key={job.opportunityId} style={[styles.rankRow, idx > 0 && styles.rankRowBorder]}>
                                <Text style={styles.rankNum}>#{idx + 1}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rankTitle} numberOfLines={1}>{job.title}</Text>
                                    <Text style={styles.rankSub}>{job.company}</Text>
                                </View>
                                <View style={styles.clicksBadge}>
                                    <Text style={styles.clicksNum}>{job.clicks}</Text>
                                    <Text style={styles.clicksLabel}>clicks</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}

            <SectionTitle icon={<BarChart3 size={15} color={theme.colors.primary} />} title="Traffic Sources (30d)" />
            <View style={styles.card}>
                <ChannelBar label="Telegram" value={ch?.telegram ?? 0} pct={getPct(ch?.telegram ?? 0)} color="#229ED9" />
                <ChannelBar label="WhatsApp" value={ch?.whatsapp ?? 0} pct={getPct(ch?.whatsapp ?? 0)} color="#25D366" />
                <ChannelBar label="LinkedIn" value={ch?.linkedin ?? 0} pct={getPct(ch?.linkedin ?? 0)} color="#0A66C2" />
                <ChannelBar label="Others" value={ch?.others ?? 0} pct={getPct(ch?.others ?? 0)} color={theme.colors.textMuted} />
            </View>

            <SectionTitle icon={<Zap size={15} color={theme.colors.primary} />} title="Signup Funnel (30d)" />
            <View style={styles.card}>
                <FunnelRow label="Signup Page Views" value={a?.signupViews30d ?? 0} total={a?.signupViews30d ?? 1} color={theme.colors.primary} />
                <FunnelRow label="Completed Signups" value={a?.signupSuccess30d ?? 0} total={a?.signupViews30d ?? 1} color={theme.colors.success} />
            </View>

            {Object.keys(data.feedback ?? {}).length > 0 && (
                <>
                    <SectionTitle icon={<MessageSquare size={15} color={theme.colors.primary} />} title="Listing Feedback (30d)" />
                    <View style={styles.card}>
                        {Object.entries(data.feedback!).sort(([, a], [, b]) => (b as number) - (a as number)).map(([reason, count]: [string, any]) => (
                            <View key={reason} style={styles.feedbackRow}>
                                <Text style={styles.feedbackReason}>{reason.replace(/_/g, ' ')}</Text>
                                <Text style={styles.feedbackCount}>{count}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {(activity?.users?.length ?? 0) > 0 && (
                <>
                    <SectionTitle icon={<Clock size={15} color={theme.colors.primary} />} title="Recent Registrations" />
                    <View style={styles.card}>
                        {activity!.users!.map((u: any, idx: number) => (
                            <View key={u.id} style={[styles.activityRow, idx > 0 && styles.rankRowBorder]}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{(u.fullName || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.activityName}>{u.fullName || 'Unknown'}</Text>
                                    <Text style={styles.activitySub}>{u.email}</Text>
                                </View>
                                <Text style={styles.activityDate}>
                                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View style={styles.sectionRow}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
);

const ChannelBar = ({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) => (
    <View style={styles.channelRow}>
        <Text style={styles.channelLabel}>{label}</Text>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` as any, backgroundColor: color }]} /></View>
        <Text style={styles.channelPct}>{pct}%</Text>
        <Text style={styles.channelVal}>{value}</Text>
    </View>
);

const FunnelRow = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
    const p = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <View style={styles.channelRow}>
            <Text style={styles.channelLabel}>{label}</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(p, p > 0 ? 4 : 0)}%` as any, backgroundColor: color }]} /></View>
            <Text style={styles.channelPct}>{p}%</Text>
            <Text style={styles.channelVal}>{value.toLocaleString()}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 40, paddingTop: 4 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: theme.colors.textMuted, fontSize: 14 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    card: { marginHorizontal: 14, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 4 },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    rankRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    rankNum: { fontSize: 13, fontWeight: '800', color: theme.colors.textMuted, width: 24 },
    rankTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    rankSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    clicksBadge: { alignItems: 'center' },
    clicksNum: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    clicksLabel: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' },
    channelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    channelLabel: { fontSize: 13, color: theme.colors.text, width: 72, fontWeight: '600' },
    barTrack: { flex: 1, height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
    channelPct: { fontSize: 12, color: theme.colors.textMuted, width: 32, textAlign: 'right', fontWeight: '600' },
    channelVal: { fontSize: 12, color: theme.colors.textMuted, width: 36, textAlign: 'right' },
    feedbackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    feedbackReason: { fontSize: 13, color: theme.colors.text, textTransform: 'capitalize', flex: 1 },
    feedbackCount: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
    activityName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    activitySub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    activityDate: { fontSize: 12, color: theme.colors.textMuted },
});
