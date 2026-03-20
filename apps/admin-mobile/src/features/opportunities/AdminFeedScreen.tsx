import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Plus, Edit3, Search } from 'lucide-react-native';
import { CompanyLogo } from '../../components/CompanyLogo';
import { useTheme } from '../../theme/ThemeProvider';
import { useAdminFeed } from './hooks/useAdminFeed';
import { Screen, PageIntro, Section } from '../system/layout/Layout';
import { MetricCard } from '../system/components/SpecializedCards';
import { MetricGrid } from '../analytics/components/Metrics';
import { AppButton } from '@repo/ui';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import type { Opportunity } from '@fresherflow/types';

type StatusColorMap = Record<string, { bg: string; text: string }>;

export const AdminFeedScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<OpportunitiesStackParamList>>();
    const { colors, spacing, typography } = useTheme();
    
    const STATUS_COLORS: StatusColorMap = {
        PUBLISHED: { bg: colors.success + '20', text: colors.success },
        DRAFT: { bg: colors.accent + '20', text: colors.accent },
        ARCHIVED: { bg: colors.textMuted + '20', text: colors.textMuted },
        EXPIRED: { bg: colors.error + '20', text: colors.error },
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
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}
            >
                <View style={styles.cardRow}>
                    <CompanyLogo
                        website={(item as { website?: string | null }).website ?? null}
                        name={String(item.company)}
                        size={44}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[typography.subheadlineStrong, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[typography.footnote, { color: colors.textMuted }]}>{String(item.company)}</Text>
                        <View style={styles.metaRow}>
                            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                <Text style={[typography.caption2Strong, { color: sc.text }]}>{item.status}</Text>
                            </View>
                            <Text style={[typography.footnoteStrong, { color: colors.textMuted }]}>{String(item.type)}</Text>
                            <Text style={[typography.caption2, { color: colors.textMuted }]}>
                                {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
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
                    <View style={{ paddingHorizontal: 20 }}>
                        <PageIntro 
                            eyebrow="Opportunities" 
                            title="Listings" 
                            action={
                                <AppButton 
                                    label="New" 
                                    onPress={() => navigation.navigate('PostOpportunity', { opportunityId: undefined })}
                                    icon={<Plus size={16} color={colors.background} />}
                                />
                            }
                        />

                        <Section title="Stats">
                            <MetricGrid>
                                <MetricCard label="Total" value={total} accent={colors.primary} />
                                <MetricCard label="Published" value={jobs.filter(j => j.status === 'PUBLISHED').length} accent={colors.success} />
                                <MetricCard label="Drafts" value={jobs.filter(j => j.status === 'DRAFT').length} accent={colors.accent} />
                            </MetricGrid>
                        </Section>

                        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
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
                    </View>
                }
                contentContainerStyle={[styles.list, { paddingBottom: spacing.xl }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
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
    },
    searchInput: { 
        flex: 1,
    },
    clearBtn: { 
        paddingHorizontal: 4 
    },
    list: { 
        paddingVertical: 12, 
    },
    card: {
        borderWidth: 1, 
    },
    cardRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    metaRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
    },
    statusBadge: { 
    },
    editBtn: { 
        borderWidth: 1 
    },
    empty: { 
        paddingTop: 60, 
        alignItems: 'center' 
    },
});
