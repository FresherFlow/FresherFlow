import React, { useState, useCallback, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Edit3, Search, CheckCircle2, Archive, Trash2, RotateCcw, Clock, Download } from 'lucide-react-native';
import { Opportunities, type Opportunity } from '../lib/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_OPPORTUNITIES_CACHE_KEY, ADMIN_OPPORTUNITIES_PAGE_SIZE } from '../lib/constants';
import { toast } from '../lib/toast';

type CachedPayload = { cachedAt: number; opportunities: Opportunity[]; query: string };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PUBLISHED: { bg: theme.colors.success + '20', text: theme.colors.success },
    DRAFT: { bg: theme.colors.accent + '20', text: theme.colors.accent },
    ARCHIVED: { bg: theme.colors.textMuted + '20', text: theme.colors.textMuted },
    EXPIRED: { bg: theme.colors.error + '20', text: theme.colors.error },
};

export const OpportunitiesListScreen = () => {
    const navigation = useNavigation<any>();
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [activeQuery, setActiveQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [error, setError] = useState<string | null>(null);
    // Ref-based lock — prevents concurrent fetches when onEndReached fires rapidly
    const fetchingRef = useRef(false);

    const fetchJobs = useCallback(async (opts: { pg?: number; force?: boolean; query?: string; status?: string; type?: string } = {}) => {
        const { pg = 1, force = false, query = activeQuery, status = statusFilter, type = typeFilter } = opts;
        if (fetchingRef.current) return;  // already in flight
        fetchingRef.current = true;
        try {
            if (pg === 1) { setLoading(true); } else { setLoadingMore(true); }
            setError(null);
            const params = {
                page: pg,
                limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
                ...(query.trim() ? { search: query.trim() } : {}),
                ...(status !== 'ALL' ? { status } : {}),
                ...(type !== 'ALL' ? { type } : {}),
            };
            const data = await Opportunities.list(params);
            const rows = data.opportunities ?? [];
            if (pg === 1) {
                setJobs(rows);
                setActiveQuery(query.trim());
                await AsyncStorage.setItem(
                    ADMIN_OPPORTUNITIES_CACHE_KEY,
                    JSON.stringify({ cachedAt: Date.now(), opportunities: rows, query: query.trim() }),
                );
            } else {
                // Deduplicate by ID — guards against concurrent onEndReached calls
                setJobs(prev => {
                    const seen = new Set(prev.map(j => j.id));
                    return [...prev, ...rows.filter(r => !seen.has(r.id))];
                });
            }
            setTotal(data.total ?? rows.length);
            setPage(pg);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [activeQuery, statusFilter, typeFilter]);

    useFocusEffect(useCallback(() => {
        fetchingRef.current = false;  // reset lock on focus
        const bootstrap = async () => {
            const raw = await AsyncStorage.getItem(ADMIN_OPPORTUNITIES_CACHE_KEY).catch(() => null);
            if (raw) {
                try {
                    const p = JSON.parse(raw) as CachedPayload;
                    if (p.opportunities) { setJobs(p.opportunities); setLoading(false); }
                } catch { /* ignore */ }
            }
            void fetchJobs({ force: true });
        };
        void bootstrap();
    }, [statusFilter, typeFilter]));

    const onRefresh = () => { setRefreshing(true); void fetchJobs({ force: true }); };
    const onSearch = () => { setPage(1); void fetchJobs({ force: true, query: searchInput, status: statusFilter, type: typeFilter }); };
    const onStatusFilter = (s: string) => { setStatusFilter(s); void fetchJobs({ force: true, query: activeQuery, status: s, type: typeFilter }); };
    const onTypeFilter = (t: string) => { setTypeFilter(t); void fetchJobs({ force: true, query: activeQuery, status: statusFilter, type: t }); };
    const onLoadMore = () => {
        // Use ref (not state) for the concurrent guard — state updates are async
        if (!fetchingRef.current && jobs.length < total) {
            void fetchJobs({ pg: page + 1 });
        }
    };

    // ── Actions ───────────────────────────────────────────────────────────────

    const confirmAction = (title: string, body: string, action: () => Promise<void>, destructive = false) => {
        Alert.alert(title, body, [
            { text: 'Cancel', style: 'cancel' },
            { text: destructive ? 'Confirm' : 'OK', style: destructive ? 'destructive' : 'default', onPress: () => void action() },
        ]);
    };

    const handleExpire = (id: string, title: string) => {
        Alert.prompt(
            'Expire Opportunity',
            `Enter a reason for expiring "${title}" (optional):`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Expire',
                    style: 'destructive',
                    onPress: async (reason?: string) => {
                        try {
                            await Opportunities.expire(id, reason);
                            void fetchJobs({ force: true });
                        } catch (e) {
                            toast.error('Expire failed', e instanceof Error ? e.message : 'Failed');
                        }
                    },
                },
            ],
            'plain-text',
        );
    };

    const handleRestore = (id: string) =>
        confirmAction('Restore Opportunity?', 'This will restore the expired opportunity.', async () => {
            await Opportunities.restore(id);
            void fetchJobs({ force: true });
        });

    const handleDelete = (id: string, title: string) => {
        Alert.prompt(
            'Delete Opportunity',
            `Type a reason for deleting "${title}":`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async (reason?: string) => {
                        try {
                            await Opportunities.delete(id, reason);
                            void fetchJobs({ force: true });
                        } catch (e) {
                            toast.error('Delete failed', e instanceof Error ? e.message : 'Failed');
                        }
                    },
                },
            ],
            'plain-text',
        );
    };

    const handlePublish = (id: string) => {
        Alert.alert('Publish Opportunity?', 'This will make the opportunity live.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Publish', onPress: async () => {
                    try {
                        await Opportunities.update(id, { status: 'PUBLISHED' });
                        void fetchJobs({ force: true });
                    } catch (e) {
                        toast.error('Publish failed', e instanceof Error ? e.message : 'Failed');
                    }
                }
            },
        ]);
    };

    const handleExport = () => {
        Alert.alert(
            'Export Opportunities',
            `Export ${statusFilter !== 'ALL' ? statusFilter : 'all'} opportunities as CSV?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Export', onPress: async () => {
                        try {
                            Alert.alert('Exporting…', 'The CSV will be available in your downloads shortly.');
                            await Opportunities.export(statusFilter !== 'ALL' ? { status: statusFilter } : {});
                        } catch (e) {
                            toast.error('Export failed', e instanceof Error ? e.message : 'Export failed');
                        }
                    },
                },
            ],
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const renderItem = ({ item }: { item: Opportunity }) => {
        const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.ARCHIVED;
        const isExpired = item.status === 'EXPIRED' || item.status === 'ARCHIVED';
        return (
            <View style={styles.jobCard}>
                <View style={styles.jobHeader}>
                    <CompanyLogo
                        website={(item as any).website ?? null}
                        name={String(item.company)}
                        size={38}
                    />
                    <TouchableOpacity style={{ flex: 1, paddingRight: 8, marginLeft: 4 }} onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}>
                        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.jobCompany}>{String(item.company)}</Text>
                    </TouchableOpacity>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                    </View>
                </View>
                <View style={styles.jobFooter}>
                    <Text style={styles.jobDate}>
                        {item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString('en-IN') : '—'}
                        {' · '}{String(item.type)}
                    </Text>
                    <View style={styles.actionRow}>
                        {item.status === 'DRAFT' && (
                            <ActionBtn icon={<CheckCircle2 size={15} color={theme.colors.success} />} onPress={() => handlePublish(String(item.id))} />
                        )}
                        {item.status === 'PUBLISHED' && (
                            <ActionBtn icon={<Clock size={15} color={theme.colors.accent} />} onPress={() => handleExpire(String(item.id), String(item.title))} />
                        )}
                        {isExpired && (
                            <ActionBtn icon={<RotateCcw size={15} color={theme.colors.primary} />} onPress={() => handleRestore(String(item.id))} />
                        )}
                        <ActionBtn icon={<Edit3 size={15} color={theme.colors.primary} />} onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })} />
                        <ActionBtn icon={<Trash2 size={15} color={theme.colors.error} />} onPress={() => handleDelete(String(item.id), String(item.title))} />
                    </View>
                </View>
            </View>
        );
    };

    const STATUSES = ['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED', 'EXPIRED'] as const;
    const TYPE_FILTERS = [
        { label: 'All Types', value: 'ALL' },
        { label: '💼 Jobs', value: 'JOB' },
        { label: '🎓 Internships', value: 'INTERNSHIP' },
        { label: '🚶 Walk-ins', value: 'WALKIN' },
    ];

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Search size={16} color={theme.colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search title, company…"
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={onSearch}
                    returnKeyType="search"
                />
                {searchInput.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchInput(''); void fetchJobs({ force: true, query: '', status: statusFilter }); }}>
                        <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Filters */}
            <View style={styles.filterRow}>
                {STATUSES.map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                        onPress={() => onStatusFilter(s)}
                    >
                        <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Type Filters — Jobs / Internships / Walk-ins split */}
            <View style={styles.typeFilterRow}>
                {TYPE_FILTERS.map(({ label, value }) => (
                    <TouchableOpacity
                        key={value}
                        style={[styles.typeChip, typeFilter === value && styles.typeChipActive]}
                        onPress={() => onTypeFilter(value)}
                    >
                        <Text style={[styles.typeChipText, typeFilter === value && styles.typeChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={i => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ padding: 16 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No opportunities found.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB row */}
            <View style={styles.fabRow}>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                    <Download size={16} color={theme.colors.primary} />
                    <Text style={styles.exportBtnText}>Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PostOpportunity', {})}>
                    <Plus size={26} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ActionBtn = ({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>{icon}</TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: theme.colors.text },
    clearBtn: { color: theme.colors.textMuted, fontSize: 16, paddingHorizontal: 4 },
    filterRow: {
        flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
        backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        flexWrap: 'wrap',
    },
    filterChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
        backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
    },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
    filterChipTextActive: { color: '#fff' },
    typeFilterRow: {
        flexDirection: 'row' as const, gap: 6, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: theme.colors.background, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    typeChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
        backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    },
    typeChipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
    typeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    typeChipTextActive: { color: '#fff' },
    errorBox: { margin: 14, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
    errorText: { color: '#B91C1C', fontSize: 13 },
    list: { padding: 14, gap: 12, paddingBottom: 88 },
    jobCard: {
        backgroundColor: theme.colors.surface, borderRadius: 12,
        borderWidth: 1, borderColor: theme.colors.border, padding: 14,
    },
    jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    jobTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
    jobCompany: { fontSize: 13, color: theme.colors.textMuted },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    jobFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10,
    },
    jobDate: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
    actionRow: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 7, borderRadius: 8, backgroundColor: theme.colors.background },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: theme.colors.textMuted, fontSize: 14 },
    fabRow: {
        position: 'absolute', right: 16, bottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    exportBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.surface, borderRadius: 24,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: theme.colors.primary,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
    },
    exportBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
    fab: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: theme.colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
});
