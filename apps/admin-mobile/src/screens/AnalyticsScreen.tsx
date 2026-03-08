import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Users, MousePointerClick, TrendingUp, AlertTriangle,
    MessageSquare, Zap, BarChart3, Clock,
} from 'lucide-react-native';
import { Analytics } from '../lib/api';
import { theme } from '../theme';

// These types are what the analytics overview actually returns
type AnalyticsData = {
    linkHealth?: { healthy: number; broken: number; retrying: number };
    opportunityStatus?: { published: number; draft: number; archived: number };
    activity?: {
        applications30d: number;
        newUsers30d: number;
        bookmarks7d: number;
        dau: number;
        wau: number;
        returningUsers7d: number;
        returningRate7d: number;
        signupViews30d: number;
        signupSuccess30d: number;
        signupConversionRate30d: number;
    };
    typeDistribution?: { type: string; count: number }[];
    feedback?: Record<string, number>;
    clicks?: {
        applyClicks30d: number;
        uniqueUserClickers30d: number;
        uniqueAnonSessions30d: number;
        topClickedOpportunities: { opportunityId: string; clicks: number; title: string; company: string }[];
    };
    channelAttribution?: { telegram: number; whatsapp: number; linkedin: number; others: number };
    urgent?: { closingSoon48h: number; brokenLinks: number };
    [key: string]: unknown;
};

type RecentActivityData = {
    actions?: { id: string; actionType: string; createdAt: string; user: { fullName: string; email: string } | null; opportunity: { title: string; company: string } | null }[];
    users?: { id: string; fullName: string; email: string; createdAt: string; profile: { completionPercentage: number } | null }[];
    [key: string]: unknown;
};

export const AnalyticsScreen = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [activity, setActivity] = useState<RecentActivityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [overview, recent] = await Promise.all([
                Analytics.overview() as Promise<AnalyticsData>,
                Analytics.recentActivity() as unknown as Promise<RecentActivityData>,
            ]);
            setData(overview);
            setActivity(recent);
        } catch {
            // fail silently — show stale
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    const a = data?.activity;
    const ch = data?.channelAttribution;
    const totalChannel = (ch?.telegram ?? 0) + (ch?.whatsapp ?? 0) + (ch?.linkedin ?? 0) + (ch?.others ?? 0);
    const pct = (n: number) => totalChannel > 0 ? Math.round((n / totalChannel) * 100) : 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : !data ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No analytics data</Text></View>
            ) : (
                <>
                    {/* Urgent banner */}
                    {((data.urgent?.closingSoon48h ?? 0) > 0 || (data.urgent?.brokenLinks ?? 0) > 0) && (
                        <View style={styles.urgentBanner}>
                            <AlertTriangle size={16} color="#FCD34D" />
                            <Text style={styles.urgentText}>
                                {(data.urgent?.brokenLinks ?? 0) > 0 ? `${data.urgent!.brokenLinks} broken links` : ''}
                                {(data.urgent?.brokenLinks ?? 0) > 0 && (data.urgent?.closingSoon48h ?? 0) > 0 ? ' · ' : ''}
                                {(data.urgent?.closingSoon48h ?? 0) > 0 ? `${data.urgent!.closingSoon48h} closing in 48h` : ''}
                            </Text>
                        </View>
                    )}

                    {/* User Activity */}
                    <SectionTitle icon={<Users size={15} color={theme.colors.primary} />} title="User Activity (30d)" />
                    <View style={styles.kpiGrid}>
                        <KpiCard label="DAU" value={a?.dau ?? 0} accent={theme.colors.primary} />
                        <KpiCard label="WAU" value={a?.wau ?? 0} accent={theme.colors.secondary} />
                        <KpiCard label="Returning (7d)" value={a?.returningRate7d ?? 0} suffix="%" accent={theme.colors.success} />
                        <KpiCard label="New Users" value={a?.newUsers30d ?? 0} accent={theme.colors.accent} />
                        <KpiCard label="Signups" value={a?.signupSuccess30d ?? 0} accent={theme.colors.primary} />
                        <KpiCard label="Signup CVR" value={a?.signupConversionRate30d ?? 0} suffix="%" accent={theme.colors.success} />
                    </View>

                    {/* Apply Clicks */}
                    <SectionTitle icon={<MousePointerClick size={15} color={theme.colors.primary} />} title="Apply Clicks (30d)" />
                    <View style={styles.kpiGrid}>
                        <KpiCard label="Total Clicks" value={data.clicks?.applyClicks30d ?? 0} accent={theme.colors.primary} />
                        <KpiCard label="Unique Users" value={data.clicks?.uniqueUserClickers30d ?? 0} accent={theme.colors.secondary} />
                        <KpiCard label="Anon Sessions" value={data.clicks?.uniqueAnonSessions30d ?? 0} accent={theme.colors.textMuted} />
                        <KpiCard label="Bookmarks (7d)" value={a?.bookmarks7d ?? 0} accent={theme.colors.accent} />
                    </View>

                    {/* Top clicked jobs */}
                    {(data.clicks?.topClickedOpportunities?.length ?? 0) > 0 && (
                        <>
                            <SectionTitle icon={<TrendingUp size={15} color={theme.colors.primary} />} title="Top Clicked Opportunities" />
                            <View style={styles.card}>
                                {data.clicks!.topClickedOpportunities.slice(0, 6).map((job, idx) => (
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

                    {/* Traffic sources */}
                    <SectionTitle icon={<BarChart3 size={15} color={theme.colors.primary} />} title="Traffic Sources (30d)" />
                    <View style={styles.card}>
                        <ChannelBar label="Telegram" value={ch?.telegram ?? 0} pct={pct(ch?.telegram ?? 0)} color="#229ED9" />
                        <ChannelBar label="WhatsApp" value={ch?.whatsapp ?? 0} pct={pct(ch?.whatsapp ?? 0)} color="#25D366" />
                        <ChannelBar label="LinkedIn" value={ch?.linkedin ?? 0} pct={pct(ch?.linkedin ?? 0)} color="#0A66C2" />
                        <ChannelBar label="Others" value={ch?.others ?? 0} pct={pct(ch?.others ?? 0)} color={theme.colors.textMuted} />
                    </View>

                    {/* Signup funnel */}
                    <SectionTitle icon={<Zap size={15} color={theme.colors.primary} />} title="Signup Funnel (30d)" />
                    <View style={styles.card}>
                        <FunnelRow label="Signup Page Views" value={a?.signupViews30d ?? 0} total={a?.signupViews30d ?? 1} color={theme.colors.primary} />
                        <FunnelRow label="Completed Signups" value={a?.signupSuccess30d ?? 0} total={a?.signupViews30d ?? 1} color={theme.colors.success} />
                    </View>

                    {/* Feedback distribution */}
                    {Object.keys(data.feedback ?? {}).length > 0 && (
                        <>
                            <SectionTitle icon={<MessageSquare size={15} color={theme.colors.primary} />} title="Listing Feedback (30d)" />
                            <View style={styles.card}>
                                {Object.entries(data.feedback!).sort(([, a], [, b]) => b - a).map(([reason, count]) => (
                                    <View key={reason} style={styles.feedbackRow}>
                                        <Text style={styles.feedbackReason}>{reason.replace(/_/g, ' ')}</Text>
                                        <Text style={styles.feedbackCount}>{count}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Recent registrations */}
                    {(activity?.users?.length ?? 0) > 0 && (
                        <>
                            <SectionTitle icon={<Clock size={15} color={theme.colors.primary} />} title="Recent Registrations" />
                            <View style={styles.card}>
                                {activity!.users!.map((u, idx) => (
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
                </>
            )}
        </ScrollView>
    );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View style={styles.sectionRow}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
);
const KpiCard = ({ label, value, suffix, accent }: { label: string; value: number; suffix?: string; accent: string }) => (
    <View style={[styles.kpiCard, { borderTopColor: accent }]}>
        <Text style={styles.kpiValue}>{value.toLocaleString()}{suffix ?? ''}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
    </View>
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
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: theme.colors.textMuted, fontSize: 14 },
    urgentBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#451A03', borderRadius: 10, margin: 14,
        padding: 12, borderWidth: 1, borderColor: '#92400E',
    },
    urgentText: { color: '#FCD34D', fontSize: 13, fontWeight: '600', flex: 1 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10, marginBottom: 4 },
    kpiCard: {
        width: '30%', flexGrow: 1,
        backgroundColor: theme.colors.surface, borderRadius: 12,
        padding: 12, borderTopWidth: 3, borderWidth: 1, borderColor: theme.colors.border,
    },
    kpiValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
    kpiLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
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
