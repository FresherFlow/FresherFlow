import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Search, Download, X } from 'lucide-react-native';
import { type Opportunity } from '../lib/api';
import { theme } from '../theme';
import { useOpportunitiesList, useOpportunityActions } from '../hooks/useOpportunitiesList';

// Components
import { JobCard } from '../components/opportunities/JobCard';

const STATUSES = ['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED', 'EXPIRED'] as const;
const TYPE_FILTERS = [
    { label: 'All Types', value: 'ALL'        },
    { label: '💼 Jobs',         value: 'JOB'        },
    { label: '🎓 Internships',  value: 'INTERNSHIP' },
    { label: '🚶 Walk-ins',     value: 'WALKIN'     },
];

export const OpportunitiesListScreen = () => {
    const navigation = useNavigation<any>();

    const {
        jobs, total, loading, loadingMore, refreshing, error,
        req, draftQuery,
        bootstrap, onDraftChange, onSubmitSearch, onClearSearch,
        onStatusFilter, onTypeFilter, onRefresh, onLoadMore, reload
    } = useOpportunitiesList();

    useFocusEffect(useCallback(() => { void bootstrap(); }, [bootstrap]));

    const { handleExpire, handleRestore, handleDelete, handlePublish, handleExport } = useOpportunityActions(reload);

    const renderItem = ({ item }: { item: Opportunity }) => (
        <JobCard 
            item={item} 
            navigation={navigation}
            handlePublish={handlePublish}
            handleExpire={handleExpire}
            handleRestore={handleRestore}
            handleDelete={handleDelete}
        />
    );

    const hasActiveFilters = req.q || req.status !== 'ALL' || req.type !== 'ALL';

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Search size={16} color={theme.colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search title, company, description..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={draftQuery}
                    onChangeText={onDraftChange}
                    onSubmitEditing={onSubmitSearch}
                    returnKeyType="search"
                />
                {draftQuery.length > 0 && (
                    <TouchableOpacity onPress={onClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Result + active filter summary strip */}
            {!loading && (
                <View style={styles.summaryStrip}>
                    <Text style={styles.summaryCount}>
                        {total} result{total !== 1 ? 's' : ''}
                    </Text>
                    <View style={styles.summaryChips}>
                        {req.q ? (
                            <View style={styles.activeChip}>
                                <Text style={styles.activeChipText} numberOfLines={1}>"{req.q}"</Text>
                                <TouchableOpacity onPress={onClearSearch}>
                                    <X size={10} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        {req.status !== 'ALL' && (
                            <View style={styles.activeChip}>
                                <Text style={styles.activeChipText}>{req.status}</Text>
                                <TouchableOpacity onPress={() => onStatusFilter('ALL')}>
                                    <X size={10} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {req.type !== 'ALL' && (
                            <View style={styles.activeChip}>
                                <Text style={styles.activeChipText}>{req.type}</Text>
                                <TouchableOpacity onPress={() => onTypeFilter('ALL')}>
                                    <X size={10} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Status Filters */}
            <View style={styles.filterRow}>
                {STATUSES.map((s: any) => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.filterChip, req.status === s && styles.filterChipActive]}
                        onPress={() => onStatusFilter(s)}
                    >
                        <Text style={[styles.filterChipText, req.status === s && styles.filterChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Type Filters */}
            <View style={styles.typeFilterRow}>
                {TYPE_FILTERS.map(({ label, value }: any) => (
                    <TouchableOpacity
                        key={value}
                        style={[styles.typeChip, req.type === value && styles.typeChipActive]}
                        onPress={() => onTypeFilter(value)}
                    >
                        <Text style={[styles.typeChipText, req.type === value && styles.typeChipTextActive]}>{label}</Text>
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
                            {hasActiveFilters ? (
                                <>
                                    <Text style={styles.emptyTitle}>No results found</Text>
                                    <Text style={styles.emptyText}>
                                        {req.q ? `Nothing matched "${req.q}"` : 'No listings match the current filters.'}
                                        {'\n'}Try clearing the filters or adjusting your search.
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.emptyText}>No opportunities found.</Text>
                            )}
                        </View>
                    }
                />
            )}

            {/* FAB row */}
            <View style={styles.fabRow}>
                <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport(req.status)}>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
    summaryStrip: {
        flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
        paddingHorizontal: 14, paddingVertical: 6,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    summaryCount: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    activeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: theme.colors.primary + '18',
        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    },
    activeChipText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, maxWidth: 100 },
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
    emptyState: { padding: 40, alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
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
