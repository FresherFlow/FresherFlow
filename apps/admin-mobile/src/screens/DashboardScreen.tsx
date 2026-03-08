import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    TrendingUp, Users, Briefcase, Eye, MousePointerClick,
    BookmarkCheck, Plus, RefreshCw, AlertTriangle,
} from 'lucide-react-native';
import { System, Analytics, type MetricsV2, type RecentActivity } from '../lib/api';
import { theme } from '../theme';


export const DashboardScreen = () => {
    const navigation = useNavigation<any>();
    const [metrics, setMetrics] = useState<MetricsV2 | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [window, setWindow] = useState<'24h' | '7d' | '30d'>('7d');
    const [urgent, setUrgent] = useState<{ closingSoon48h: number; brokenLinks: number } | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity['items']>([]);
    const [_, setFetchError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async (w = window) => {
        setFetchError(null);
        try {
            const [metricsData, analyticsData, activityData] = await Promise.allSettled([
                System.metricsV2(w),
                Analytics.overview(),
                Analytics.recentActivity(),
            ]);
            if (metricsData.status === 'fulfilled') {
                setMetrics(metricsData.value);
            } else {
                const msg = (metricsData.reason as Error)?.message || String(metricsData.reason);
                console.error('[Dashboard] metrics-v2 failed:', msg);
                setFetchError(msg);
            }
            if (analyticsData.status === 'fulfilled') setUrgent(analyticsData.value.urgent);
            if (activityData.status === 'fulfilled') setRecentActivity(activityData.value.items?.slice(0, 8) ?? []);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[Dashboard] fetch error:', msg);
            setFetchError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [window]);

    useFocusEffect(useCallback(() => {
        void fetchMetrics(window);
    }, [window, fetchMetrics]));

    const onRefresh = () => {
        setRefreshing(true);
        void fetchMetrics(window);
    };

    const switchWindow = (w: '24h' | '7d' | '30d') => {
        setWindow(w);
        setLoading(true);
        void fetchMetrics(w);
    };


    const listings = metrics?.listings;
    const traffic = metrics?.traffic;
    const funnel = metrics?.funnel;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >

            {/* Urgent Banner */}
            {urgent && (urgent.brokenLinks > 0 || urgent.closingSoon48h > 0) && (
                <View style={styles.urgentBanner}>
                    <AlertTriangle size={15} color="#FCD34D" />
                    <Text style={styles.urgentText}>
                        {[urgent.brokenLinks > 0 && `${urgent.brokenLinks} broken links`, urgent.closingSoon48h > 0 && `${urgent.closingSoon48h} closing in 48h`].filter(Boolean).join(' · ')}
                    </Text>
                </View>
            )}

            {/* Window Selector */}
            <View style={styles.windowRow}>
                {(['24h', '7d', '30d'] as const).map(w => (
                    <TouchableOpacity
                        key={w}
                        style={[styles.windowBtn, window === w && styles.windowBtnActive]}
                        onPress={() => switchWindow(w)}
                    >
                        <Text style={[styles.windowBtnText, window === w && styles.windowBtnTextActive]}>
                            {w === '24h' ? '24 Hours' : w === '7d' ? '7 Days' : '30 Days'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <>
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.sectionHeader} onPress={() => navigation.navigate('Opportunities')}>
                            <Text style={styles.sectionTitle}>Opportunities</Text>
                            <Text style={styles.sectionLink}>View all →</Text>
                        </TouchableOpacity>
                        <View style={styles.kpiGrid}>
                            <KpiCard label="Published" value={listings?.published ?? 0} icon={<Briefcase size={18} color={theme.colors.primary} />} accent={theme.colors.primary} onPress={() => navigation.navigate('Opportunities')} />
                            <KpiCard label="New (24h)" value={listings?.new24h ?? 0} icon={<TrendingUp size={18} color={theme.colors.success} />} accent={theme.colors.success} onPress={() => navigation.navigate('Opportunities')} />
                            <KpiCard label="Draft" value={listings?.drafts ?? 0} icon={<BookmarkCheck size={18} color={theme.colors.accent} />} accent={theme.colors.accent} onPress={() => navigation.navigate('Opportunities')} />
                            <KpiCard label="Live" value={listings?.live ?? 0} icon={<Eye size={18} color={theme.colors.secondary} />} accent={theme.colors.secondary} onPress={() => navigation.navigate('Opportunities')} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TouchableOpacity style={styles.sectionHeader} onPress={() => navigation.navigate('Analytics')}>
                            <Text style={styles.sectionTitle}>Users & Engagement</Text>
                            <Text style={styles.sectionLink}>Analytics →</Text>
                        </TouchableOpacity>
                        <View style={styles.kpiGrid}>
                            <KpiCard label="New Users (30d)" value={traffic?.newUsers30d ?? 0} icon={<Users size={18} color={theme.colors.primary} />} accent={theme.colors.primary} />
                            <KpiCard label="DAU" value={traffic?.dau ?? 0} icon={<TrendingUp size={18} color={theme.colors.success} />} accent={theme.colors.success} />
                            <KpiCard label="WAU" value={traffic?.wau ?? 0} icon={<BookmarkCheck size={18} color={theme.colors.secondary} />} accent={theme.colors.secondary} />
                            <KpiCard label="Apply Clicks" value={funnel?.applyClick ?? 0} icon={<MousePointerClick size={18} color={theme.colors.accent} />} accent={theme.colors.accent} />
                        </View>
                    </View>

                    {/* Link Health */}
                    {metrics?.linkHealth && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Link Health</Text>
                            <View style={styles.kpiGrid}>
                                <KpiCard label="Healthy" value={metrics.linkHealth.healthy} icon={<Eye size={18} color={theme.colors.success} />} accent={theme.colors.success} />
                                <KpiCard label="Retrying" value={metrics.linkHealth.retrying} icon={<RefreshCw size={18} color={theme.colors.accent} />} accent={theme.colors.accent} />
                                <KpiCard label="Broken" value={metrics.linkHealth.broken} icon={<AlertTriangle size={18} color={theme.colors.error} />} accent={theme.colors.error} onPress={() => navigation.navigate('Ops')} />
                            </View>
                        </View>
                    )}

                    {/* Funnel */}
                    {funnel && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Funnel ({window})</Text>
                            <View style={styles.funnelList}>
                                {([
                                    ['Detail Views', funnel.detailView],
                                    ['Apply Clicks', funnel.applyClick],
                                    ['Auth Success', funnel.authSuccess],
                                ] as [string, number][]).map(([label, value]) => (
                                    <View key={label} style={styles.funnelRow}>
                                        <Text style={styles.funnelLabel}>{label}</Text>
                                        <Text style={styles.funnelValue}>{(value ?? 0).toLocaleString()}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Recent listings */}
                    {metrics?.recentListings && metrics.recentListings.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Listings</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Opportunities')}>
                                    <Text style={styles.sectionLink}>View all →</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.activityList}>
                                {metrics.recentListings.map((item: { id: string; title: string; company: string; type: string; postedAt: string }) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.activityRow}
                                        onPress={() => navigation.navigate('Opportunities', { screen: 'OpportunityDetail', params: { opportunityId: item.id } })}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.activityAction} numberOfLines={1}>{item.company}</Text>
                                            <Text style={styles.activityEntity} numberOfLines={1}>{item.title}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.activityTime}>{item.type}</Text>
                                            <Text style={styles.activityTime}>{timeSince(item.postedAt)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => navigation.navigate('Opportunities', { screen: 'PostOpportunity', params: {} })}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <Plus size={22} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.actionLabel}>Post Opportunity</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={onRefresh}>
                                <View style={[styles.actionIcon, { backgroundColor: theme.colors.success + '15' }]}>
                                    <RefreshCw size={22} color={theme.colors.success} />
                                </View>
                                <Text style={styles.actionLabel}>Refresh Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Recent Activity */}
                    {recentActivity.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                            <View style={styles.activityList}>
                                {recentActivity.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.activityRow}
                                        onPress={() => {
                                            if (item.entity === 'opportunity') {
                                                navigation.navigate('Opportunities', { screen: 'OpportunityDetail', params: { opportunityId: item.id } });
                                            }
                                        }}
                                    >
                                        <View style={[styles.activityDot, { backgroundColor: actionColor(item.action) }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.activityAction}>{item.action.replace(/_/g, ' ')}</Text>
                                            <Text style={styles.activityEntity} numberOfLines={1}>{item.entity}</Text>
                                        </View>
                                        <Text style={styles.activityTime}>{timeSince(item.createdAt)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
};

function KpiCard({ label, value, icon, accent, onPress }: { label: string; value: number; icon: React.ReactNode; accent: string; onPress?: () => void }) {
    return (
        <TouchableOpacity style={[styles.kpiCard, { borderTopColor: accent, borderTopWidth: 3 }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
            <View style={styles.kpiIconRow}>{icon}</View>
            <Text style={styles.kpiValue}>{value.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function timeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function actionColor(action: string) {
    if (action.includes('DELETE') || action.includes('EXPIR')) return theme.colors.error;
    if (action.includes('PUBLISH') || action.includes('RESTOR')) return theme.colors.success;
    if (action.includes('CREATE')) return theme.colors.secondary;
    return theme.colors.primary;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 32 },
    urgentBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#451A03', marginHorizontal: 16, marginTop: 12,
        borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#92400E',
    },
    urgentText: { color: '#FCD34D', fontSize: 13, fontWeight: '600', flex: 1 },
    errorBanner: {
        marginHorizontal: 16, marginTop: 12, padding: 12,
        backgroundColor: '#FEF2F2', borderRadius: 10,
        borderWidth: 1, borderColor: '#FECACA',
    },
    errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
    errorSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, flex: 1 },
    adminBadge: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    logoIcon: { width: 20, height: 20, borderRadius: 4 },
    logoutBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    windowRow: {
        flexDirection: 'row',
        margin: 16,
        backgroundColor: theme.colors.border + '50',
        borderRadius: 10,
        padding: 4,
        gap: 4,
    },
    windowBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    windowBtnActive: { backgroundColor: theme.colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    windowBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
    windowBtnTextActive: { color: theme.colors.primary },
    section: { marginTop: 20, paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    sectionLink: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpiCard: {
        width: '47%',
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    kpiIconRow: { marginBottom: 8 },
    kpiValue: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    kpiLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 10,
    },
    actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
    activityList: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '60' },
    activityDot: { width: 8, height: 8, borderRadius: 4 },
    activityAction: { fontSize: 13, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
    activityEntity: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
    activityTime: { fontSize: 11, color: theme.colors.textMuted },
    funnelList: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    funnelRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '60' },
    funnelLabel: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
    funnelValue: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
});
