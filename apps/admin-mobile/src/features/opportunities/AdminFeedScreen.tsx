import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Edit3, Search } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';
import { useAdminFeed } from './hooks/useAdminFeed';
import { Screen, Section, PremiumHeader } from '../system/layout/Layout';
import { MetricCard } from '../system/components/SpecializedCards';
import { MetricGrid } from '../analytics/components/Metrics';
import { AppButton } from '@repo/ui';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import type { Opportunity } from '@fresherflow/types';

type StatusColorMap = Record<string, string>;

export const AdminFeedScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<OpportunitiesStackParamList>>();
    const { colors, typography } = useTheme();
    
    const STATUS_COLORS: StatusColorMap = {
        PUBLISHED: colors.success,
        DRAFT: colors.accent,
        ARCHIVED: colors.textMuted,
        EXPIRED: colors.error,
    };

    const {
        jobs,
        total,
        loading,
        loadingMore,
        refreshing,
        searchInput,
        setSearchInput,
        error,
        fetchJobs,
        loadMore,
        onRefresh,
        handleSearch,
    } = useAdminFeed();

    useFocusEffect(
        useCallback(() => {
            void fetchJobs();
        }, [fetchJobs])
    );

    const renderItem = ({ item }: { item: Opportunity }) => {
        const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.ARCHIVED;
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: alpha(colors.border, 0.4) }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}
            >
                <View style={styles.cardRow}>
                    <CompanyLogo
                        website={(item as { website?: string | null }).website ?? (item as Opportunity & { companyWebsite?: string | null }).companyWebsite ?? null}
                        logoUrl={item.companyLogoUrl}
                        applyLink={item.applyLink}
                        name={String(item.company)}
                        size={mScale(44)}
                    />
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <Text style={[typography.subheadlineStrong, { fontSize: mScale(15), color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[typography.footnote, { fontSize: mScale(13), color: colors.textMuted }]}>{String(item.company)}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.statusBadge, { backgroundColor: alpha(sc, 0.15) }]}>
                                <Text style={[typography.caption2Strong, { fontSize: mScale(10), color: sc, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{item.status}</Text>
                            </View>
                            <Text style={[typography.footnoteStrong, { fontSize: mScale(12), color: colors.textMuted }]}>{String(item.type)}</Text>
                            <Text style={[typography.caption2, { fontSize: mScale(11), color: colors.textMuted }]}>
                                {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: alpha(colors.text, 0.03), borderColor: alpha(colors.border, 0.1) }]}
                        onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })}
                    >
                        <Edit3 size={15} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Screen>
            <FlatList
                data={jobs}
                keyExtractor={i => String(i.id)}
                renderItem={renderItem}
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: SPACING.md }}>
                        <PremiumHeader
                            title="Listings"
                            subtitle="Opportunities feed"
                            rightSlot={
                                <AppButton
                                    label="New"
                                    onPress={() => navigation.navigate('PostOpportunity', { opportunityId: undefined })}
                                    icon={<Plus size={16} color={colors.background} />}
                                />
                            }
                        />

                        <Section title="Overview">
                            <MetricGrid>
                                <MetricCard label="Total" value={total} accent={colors.primary} />
                                <MetricCard label="Live" value={jobs.filter(j => j.status === 'PUBLISHED').length} accent={colors.success} />
                                <MetricCard label="Drafts" value={jobs.filter(j => j.status === 'DRAFT').length} accent={colors.accent} />
                            </MetricGrid>
                        </Section>

                        <View style={[styles.searchBar, { backgroundColor: alpha(colors.text, 0.03), borderColor: alpha(colors.border, 0.1), marginTop: SPACING.lg }]}>
                            <Search size={15} color={colors.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search title, company…"
                                placeholderTextColor={colors.textMuted}
                                value={searchInput}
                                onChangeText={setSearchInput}
                                onSubmitEditing={handleSearch}
                                returnKeyType="search"
                            />
                            {searchInput.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchInput(''); void fetchJobs({ pg: 1, query: '' }); }}>
                                    <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={{ height: SPACING.md }} />
                    </View>
                }
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: SPACING.md }} /> : null}
                ListEmptyComponent={<View style={styles.empty}><Text style={[typography.subheadline, { color: colors.textMuted }]}>{loading ? 'Loading...' : error || 'No opportunities found.'}</Text></View>}
                showsVerticalScrollIndicator={false}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.lg,
        borderWidth: 0.5,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: mScale(14),
        fontWeight: '600',
    },
    clearBtn: { paddingHorizontal: 4 },
    list: { paddingBottom: 100 },
    card: {
        borderRadius: RADIUS.lg,
        borderWidth: 0.5,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.sm,
        padding: SPACING.md,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
    editBtn: { borderWidth: 0.5, borderRadius: RADIUS.sm, padding: 8 },
    empty: { paddingTop: 60, alignItems: 'center' },
});
