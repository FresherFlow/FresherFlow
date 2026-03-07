import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Send, RefreshCw } from 'lucide-react-native';
import { Telegram, type TelegramBroadcast } from '../lib/api';
import { theme } from '../theme';
import { toast } from '../lib/toast';

type StatusFilter = 'ALL' | 'SENT' | 'FAILED' | 'PENDING' | 'RETRY';

const STATUS_META: Record<string, { color: string }> = {
    SENT: { color: theme.colors.success },
    FAILED: { color: theme.colors.error },
    PENDING: { color: theme.colors.accent },
    RETRY: { color: theme.colors.secondary },
};

const PAGE_SIZE = 30;

export const TelegramScreen = () => {
    const [broadcasts, setBroadcasts] = useState<TelegramBroadcast[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchBroadcasts = useCallback(async (opts: { pg?: number; status?: StatusFilter; force?: boolean } = {}) => {
        const { pg = 1, status = statusFilter, force = false } = opts;
        try {
            if (pg === 1) setLoading(true); else setLoadingMore(true);
            const params: Record<string, string | number> = { limit: PAGE_SIZE, page: pg };
            if (status !== 'ALL') params.status = status;
            const data = await Telegram.broadcasts(params as any) as any;
            const rows: TelegramBroadcast[] = data.broadcasts ?? [];
            if (pg === 1) setBroadcasts(rows); else setBroadcasts(prev => [...prev, ...rows]);
            setTotal(data.total ?? rows.length);
            setPage(pg);
        } catch { /* silent */ } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useFocusEffect(useCallback(() => { void fetchBroadcasts({ force: true }); }, [statusFilter]));
    const onRefresh = () => { setRefreshing(true); void fetchBroadcasts({ pg: 1, force: true }); };
    const onLoadMore = () => { if (!loadingMore && broadcasts.length < total) void fetchBroadcasts({ pg: page + 1 }); };
    const onFilter = (s: StatusFilter) => { setStatusFilter(s); void fetchBroadcasts({ pg: 1, status: s, force: true }); };

    const retryBroadcast = (id: string) => {
        Alert.alert('Retry Broadcast?', 'Re-send the failed Telegram broadcast.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Retry', onPress: async () => {
                    setRetryingId(id);
                    try {
                        await Telegram.retry(id);
                        toast.success('Retried', 'Broadcast retry queued.');
                        void fetchBroadcasts({ pg: 1, force: true });
                    } catch (e) {
                        toast.error('Retry failed', e instanceof Error ? e.message : 'Failed');
                    } finally { setRetryingId(null); }
                }
            }
        ]);
    };

    const FILTERS: StatusFilter[] = ['ALL', 'SENT', 'FAILED', 'PENDING', 'RETRY'];

    const stats = {
        sent: broadcasts.filter(b => b.status === 'SENT').length,
        failed: broadcasts.filter(b => b.status === 'FAILED').length,
        pending: broadcasts.filter(b => b.status === 'PENDING' || b.status === 'RETRY').length,
    };

    const renderItem = ({ item }: { item: TelegramBroadcast }) => {
        const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
        const isRetrying = retryingId === item.id;
        return (
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                    <View style={{ flex: 1 }}>
                        {item.opportunity && (
                            <Text style={styles.oppTitle} numberOfLines={1}>
                                {item.opportunity.title} · {item.opportunity.company}
                            </Text>
                        )}
                        <Text style={styles.msgPreview} numberOfLines={3}>{item.message}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.statusChip, { backgroundColor: meta.color + '20' }]}>
                                <Text style={[styles.statusChipText, { color: meta.color }]}>{item.status}</Text>
                            </View>
                            <Text style={styles.metaText}>
                                {item.sentAt
                                    ? new Date(item.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : item.scheduledAt
                                        ? `Scheduled: ${new Date(item.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                                        : 'Not sent'}
                            </Text>
                        </View>
                        {(item.failureReason || item.errorMessage) && (
                            <Text style={styles.failReason} numberOfLines={2}>
                                ⚠ {item.failureReason ?? item.errorMessage}
                            </Text>
                        )}
                    </View>
                    {item.status === 'FAILED' && (
                        <TouchableOpacity style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]} onPress={() => retryBroadcast(item.id)} disabled={isRetrying}>
                            {isRetrying ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={14} color="#fff" />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Stats */}
            <View style={styles.statsBanner}>
                <StatPill label="Sent" value={stats.sent} color={theme.colors.success} />
                <StatPill label="Failed" value={stats.failed} color={theme.colors.error} />
                <StatPill label="Pending" value={stats.pending} color={theme.colors.accent} />
                <StatPill label="Total" value={total} color={theme.colors.primary} />
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => onFilter(f)}>
                        <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} /> : (
                <FlatList
                    data={broadcasts}
                    keyExtractor={b => b.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ padding: 16 }} /> : null}
                    ListEmptyComponent={<View style={styles.empty}><Send size={36} color={theme.colors.border} /><Text style={styles.emptyText}>No broadcasts</Text></View>}
                />
            )}
        </View>
    );
};

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.pill, { backgroundColor: color + '15' }]}>
        <Text style={[styles.pillNum, { color }]}>{value}</Text>
        <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    statsBanner: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    pill: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    pillNum: { fontSize: 18, fontWeight: '800' },
    pillLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    filterTextActive: { color: '#fff' },
    list: { padding: 12, gap: 10, paddingBottom: 40 },
    card: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    oppTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
    msgPreview: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    statusChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    statusChipText: { fontSize: 10, fontWeight: '800' },
    metaText: { fontSize: 11, color: theme.colors.textMuted },
    failReason: { fontSize: 11, color: theme.colors.error, marginTop: 4 },
    retryBtn: { backgroundColor: theme.colors.secondary, padding: 8, borderRadius: 8, alignSelf: 'center', marginLeft: 4 },
    empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: theme.colors.textMuted },
});
