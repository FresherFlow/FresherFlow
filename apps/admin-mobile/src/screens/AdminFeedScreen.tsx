import React, { useState, useCallback, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput, Alert, Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Edit3, Search } from 'lucide-react-native';
import { Opportunities, type Opportunity } from '../lib/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_OPPORTUNITIES_CACHE_KEY, ADMIN_OPPORTUNITIES_PAGE_SIZE } from '../lib/constants';

type CachedPayload = { cachedAt: number; opportunities: Opportunity[]; query: string };

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PUBLISHED: { bg: theme.colors.success + '20', text: theme.colors.success },
    DRAFT: { bg: theme.colors.accent + '20', text: theme.colors.accent },
    ARCHIVED: { bg: theme.colors.textMuted + '20', text: theme.colors.textMuted },
    EXPIRED: { bg: theme.colors.error + '20', text: theme.colors.error },
};

export const AdminFeedScreen = () => {
    const navigation = useNavigation<any>();
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [activeQuery, setActiveQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const fetchingRef = useRef(false);

    const fetchJobs = useCallback(async (opts: { pg?: number; force?: boolean; query?: string } = {}) => {
        const { pg = 1, query = activeQuery } = opts;
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            if (pg === 1) setLoading(true); else setLoadingMore(true);
            setError(null);
            const params = {
                page: pg,
                limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
                status: 'PUBLISHED' as const,
                ...(query.trim() ? { search: query.trim() } : {}),
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
                setJobs(prev => {
                    const seen = new Set(prev.map(j => j.id));
                    return [...prev, ...rows.filter(r => !seen.has(r.id))];
                });
            }
            setTotal(data.total ?? rows.length);
            setPage(pg);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [activeQuery]);

    // Load cache immediately, then fetch
    useFocusEffect(useCallback(() => {
        fetchingRef.current = false;
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(ADMIN_OPPORTUNITIES_CACHE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw) as CachedPayload;
                    if (Array.isArray(parsed.opportunities)) setJobs(parsed.opportunities);
                }
            } catch { /* ignore */ }
            void fetchJobs({ force: true });
        })();
    }, []));

    const onRefresh = () => { setRefreshing(true); void fetchJobs({ pg: 1, force: true }); };
    const onSearch = () => { void fetchJobs({ pg: 1, query: searchInput }); };
    const onLoadMore = () => { if (!fetchingRef.current && jobs.length < total) void fetchJobs({ pg: page + 1 }); };

    const renderItem = ({ item }: { item: Opportunity }) => {
        const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.ARCHIVED;
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Opportunities', { screen: 'OpportunityDetail', params: { opportunityId: item.id } })}
            >
                <View style={styles.cardRow}>
                    <CompanyLogo
                        website={(item as any).website ?? null}
                        name={String(item.company)}
                        size={44}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.jobCompany}>{String(item.company)}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                            </View>
                            <Text style={styles.typeText}>{String(item.type)}</Text>
                            <Text style={styles.dateText}>
                                {item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => navigation.navigate('Opportunities', { screen: 'PostOpportunity', params: { opportunityId: item.id } })}
                    >
                        <Edit3 size={15} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <TouchableOpacity
                    style={styles.newBtn}
                    onPress={() => navigation.navigate('Opportunities', { screen: 'PostOpportunity', params: {} })}
                >
                    <Plus size={16} color="#fff" />
                    <Text style={styles.newBtnText}>New</Text>
                </TouchableOpacity>
            </View>

            {/* Stat chips */}
            <View style={styles.statRow}>
                <StatChip label="Total" value={total} color={theme.colors.primary} />
                <StatChip label="Live" value={jobs.filter(j => j.status === 'PUBLISHED').length} color={theme.colors.success} />
                <StatChip label="Draft" value={jobs.filter(j => j.status === 'DRAFT').length} color={theme.colors.accent} />
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
                <Search size={15} color={theme.colors.textMuted} />
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
                    <TouchableOpacity onPress={() => { setSearchInput(''); void fetchJobs({ pg: 1, query: '' }); }}>
                        <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

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
                    ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No opportunities found.</Text></View>}
                />
            )}
        </View>
    );
};

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.statChip, { backgroundColor: color + '15' }]}>
        <Text style={[styles.statNum, { color }]}>{value}</Text>
        <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    logo: { height: 28, width: 140 },
    newBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: theme.colors.primary, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 9,
    },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    statRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    statChip: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    statNum: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: theme.colors.surface, paddingHorizontal: 14, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
    clearBtn: { fontSize: 14, color: theme.colors.textMuted, paddingHorizontal: 4 },
    errorBox: { margin: 14, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
    errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
    list: { padding: 12, gap: 10, paddingBottom: 40 },
    card: {
        backgroundColor: theme.colors.surface, borderRadius: 14,
        borderWidth: 1, borderColor: theme.colors.border, padding: 14,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    jobTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
    jobCompany: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    typeText: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600' },
    dateText: { fontSize: 11, color: theme.colors.textMuted },
    editBtn: { padding: 8, borderRadius: 8, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
    empty: { paddingTop: 60, alignItems: 'center' },
    emptyText: { color: theme.colors.textMuted, fontSize: 14 },
});
