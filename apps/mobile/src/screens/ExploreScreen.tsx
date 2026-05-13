import React, { memo, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
    ScrollView,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Filter, Building2, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { SurfaceCard, PremiumHeader } from '@/system/components/PremiumPrimitives';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { FilterSheet } from '@/system/components/FilterSheet';
import { FilterChip } from '@/system/components/FilterChip';
import { SPACING } from '@/system/constants/dimensions';
import { useExplore } from '@/hooks/useExplore';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { CORE_CATEGORIES, CONTROLLED_TAGS, CATEGORY_LABELS } from '@fresherflow/constants';
import { useToast } from '@/contexts/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ExploreMain'>;

interface CompanySummary {
    name: string;
    logoUrl?: string;
    website?: string;
    opportunityCount?: number;
    industry?: string;
    firstOpp?: Opportunity;
}

type ExploreItem =
  | { type: 'stats'; key: string; count: number }
  | { type: 'opportunity'; data: Opportunity; key: string }
  | { type: 'company'; data: CompanySummary; key: string }
  | { type: 'discovery'; key: string }
  | { type: 'empty'; key: string };

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';

const CompanyCard = memo(({ company, onPress, theme }: { company: CompanySummary; onPress: () => void; theme: AppTheme }) => (
    <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
        <SurfaceCard onPress={onPress} style={{ padding: SPACING.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                <CompanyLogo
                    name={company.name}
                    logoUrl={company.logoUrl}
                    website={company.website}
                    size={56}
                />
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 }}>{company.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: alpha(theme.colors.primary, 0.1), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.primary, letterSpacing: 0.5 }}>
                                {company.opportunityCount} {company.opportunityCount === 1 ? 'JOB' : 'JOBS'}
                            </Text>
                        </View>
                        {company.industry && !['JOB', 'INTERNSHIP', 'WALKIN', 'WALK-IN'].includes(company.industry.toUpperCase()) && (
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textMuted }} numberOfLines={1}>
                                {company.industry}
                            </Text>
                        )}
                    </View>
                </View>
                <ChevronRight size={18} color={theme.colors.textMuted} opacity={0.3} />
            </View>
        </SurfaceCard>
    </View>
));

const ExploreScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { hideTabBar, showTabBar } = useUI();
    const {
        results,
        loading,
        refreshing,
        onRefresh,
        filters,
        setFilters,
        searchQuery,
        setSearchQuery
    } = useExplore();

    const [sheetVisible, setSheetVisible] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'opportunities' | 'companies'>('opportunities');

    const derivedCompanies = React.useMemo(() => {
        const unique = new Map<string, CompanySummary>();

        results.forEach(opp => {
            const existing = unique.get(opp.company);
            if (existing) {
                existing.opportunityCount = (existing.opportunityCount || 0) + 1;
            } else {
                unique.set(opp.company, {
                    name: opp.company,
                    logoUrl: opp.companyLogoUrl ?? undefined,
                    website: opp.companyWebsite ?? undefined,
                    opportunityCount: 1,
                    industry: opp.jobFunction || opp.type,
                    firstOpp: opp
                });
            }
        });

        return Array.from(unique.values());
    }, [results]);

    // Track scroll position for animations and tab bar
    const scrollOffset = useRef(0);

    const { showSuccess } = useToast();
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

        if (Math.abs(currentOffset - scrollOffset.current) > 20) {
            if (direction === 'down' && currentOffset > 100) {
                hideTabBar();
            } else if (direction === 'up' || currentOffset < 50) {
                showTabBar();
            }
            scrollOffset.current = currentOffset;
        }
    };

    const handleToggleSave = useCallback((opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    }, [isSaved, toggleSave, showSuccess]);

    const resultsCount = results.length;

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            {loading ? (
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            ) : (
                <>
                    <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                        <Compass size={48} color={currentTheme.colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Results Found</Text>
                    <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                        Try adjusting your search or filters to find what you're looking for.
                    </Text>
                </>
            )}
        </View>
    ), [loading, currentTheme]);

    const paddingTopOs = Platform.OS === 'ios' ? 50 : 20;

    const activeFilterCount = (filters.type ? 1 : 0) + (filters.workMode ? 1 : 0) + (filters.batchYear ? 1 : 0);

    const getResultsText = () => {
        if (viewMode === 'companies') return `FOUND ${derivedCompanies.length} COMPANIES`;
        if (!searchQuery && activeFilterCount === 0) return `RECENT OPPORTUNITIES`;
        let text = `FOUND ${resultsCount} RESULTS`;
        if (searchQuery.trim()) text += ` FOR "${searchQuery.toUpperCase()}"`;
        else if (filters.type) {
            const label = filters.type === 'JOB' ? 'JOBS' : filters.type === 'INTERNSHIP' ? 'INTERNSHIPS' : 'WALK-INS';
            text = `FOUND ${resultsCount} ${label}`;
        } else if (filters.tag) {
            text = `FOUND ${resultsCount} FOR ${filters.tag.toUpperCase()}`;
        }
        return text;
    };

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <FlatList<ExploreItem>
                data={(() => {
                    if (viewMode === 'companies') {
                        const items: ExploreItem[] = [];
                        items.push({ type: 'discovery', key: 'discovery' });
                        if (derivedCompanies.length > 0) {
                            items.push({ type: 'stats', key: 'company_stats', count: derivedCompanies.length });
                            derivedCompanies.forEach((c, idx) => {
                                items.push({ type: 'company', data: c, key: `company_${c.name}_${idx}` });
                            });
                        } else if (!loading) {
                            items.push({ type: 'empty', key: 'empty_state' });
                        }
                        return items;
                    }

                    const showDiscovery = !searchQuery && activeFilterCount === 0;
                    const items: ExploreItem[] = [];

                    if (showDiscovery) {
                        items.push({ type: 'discovery', key: 'discovery' });
                    }

                    if (resultsCount > 0) {
                        items.push({ type: 'stats', key: 'results_stats', count: resultsCount });
                        results.forEach((r, idx) => {
                            items.push({ type: 'opportunity', data: r, key: `${r.id}_${idx}` });
                        });
                    } else if (!loading && !showDiscovery) {
                        items.push({ type: 'empty', key: 'empty_state' });
                    }

                    return items;
                })()}
                keyExtractor={(item) => item.key}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]}
                renderItem={({ item }) => {
                    if (item.type === 'discovery') {
                        return (
                            <>
                                <View style={styles.discoverySection}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Browse Categories</Text>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.categoryScroll}
                                    >
                                        <TouchableOpacity
                                            onPress={() => setViewMode('companies')}
                                            style={[styles.categoryCard, {
                                                backgroundColor: viewMode === 'companies' ? alpha(currentTheme.colors.success, 0.15) : alpha(currentTheme.colors.success, 0.05),
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 8,
                                                borderWidth: viewMode === 'companies' ? 1 : 0,
                                                borderColor: viewMode === 'companies' ? currentTheme.colors.success : 'transparent'
                                            }]}
                                        >
                                            <Building2 size={16} color={currentTheme.colors.success} />
                                            <Text style={[styles.categoryLabel, { color: currentTheme.colors.success }]}>
                                                Companies
                                            </Text>
                                        </TouchableOpacity>

                                        {CORE_CATEGORIES.map((cat: OpportunityType) => (
                                            <TouchableOpacity
                                                key={cat}
                                                onPress={() => {
                                                    setViewMode('opportunities');
                                                    setFilters({ type: cat });
                                                }}
                                                style={[styles.categoryCard, {
                                                    backgroundColor: (viewMode === 'opportunities' && filters.type === cat) ? alpha(currentTheme.colors.primary, 0.15) : alpha(currentTheme.colors.primary, 0.05),
                                                    borderWidth: (viewMode === 'opportunities' && filters.type === cat) ? 1 : 0,
                                                    borderColor: (viewMode === 'opportunities' && filters.type === cat) ? currentTheme.colors.primary : 'transparent'
                                                }]}
                                            >
                                                <Text style={[styles.categoryLabel, { color: currentTheme.colors.primary }]}>
                                                    {CATEGORY_LABELS[cat] || cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                 <View style={styles.discoverySection}>
                                     <View style={styles.sectionHeader}>
                                         <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Trending Tags</Text>
                                     </View>
                                     <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.categoryScroll}
                                    >
                                        {[...CONTROLLED_TAGS.BATCHES, ...CONTROLLED_TAGS.ROLES].map(tag => (
                                            <TouchableOpacity
                                                key={tag}
                                                onPress={() => {
                                                    setViewMode('opportunities');
                                                    setFilters({ tag });
                                                }}
                                                style={[styles.tagChip, {
                                                    backgroundColor: (viewMode === 'opportunities' && filters.tag === tag) ? alpha(currentTheme.colors.text, 0.1) : alpha(currentTheme.colors.text, 0.05),
                                                    borderWidth: (viewMode === 'opportunities' && filters.tag === tag) ? 1 : 0,
                                                    borderColor: (viewMode === 'opportunities' && filters.tag === tag) ? currentTheme.colors.text : 'transparent'
                                                }]}
                                            >
                                                <Text style={[styles.tagText, { color: currentTheme.colors.text }]}>{tag}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </>
                        );
                    }

                    if (item.type === 'stats') {
                        return (
                            <View style={styles.resultsHeader}>
                                <Text style={[styles.resultsText, { color: currentTheme.colors.textMuted }]}>
                                    {getResultsText()}
                                </Text>
                            </View>
                        );
                    }

                    if (item.type === 'empty') {
                        return renderEmpty();
                    }

                    if (item.type === 'company') {
                        return (
                            <CompanyCard
                                company={item.data}
                                theme={currentTheme}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.navigate('CompanyDetail', {
                                        companyName: item.data.name,
                                        companyLogoUrl: item.data.logoUrl,
                                        website: item.data.website,
                                        currentJob: item.data.firstOpp
                                    });
                                }}
                            />
                        );
                    }

                    return (
                        <JobCard
                            opportunity={item.data}
                            onPress={() => {
                                void saveDetailCache(item.data);
                                navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                            }}
                            onSave={() => handleToggleSave(item.data)}
                            isSaved={isSaved(item.data.id)}
                        />
                    );
                }}
                ListHeaderComponent={
                    <View style={{ backgroundColor: currentTheme.colors.background, paddingTop: 8 }}>
                        <PremiumHeader
                            title="Discovery"
                            subtitle="Explore Opportunities"
                            style={{ paddingBottom: 0 }}
                            rightSlot={
                                <TouchableOpacity
                                    onPress={() => setSheetVisible(true)}
                                    style={[styles.filterBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                >
                                    <View>
                                        <Filter size={20} color={currentTheme.colors.primary} />
                                        {activeFilterCount > 0 && (
                                            <View style={[styles.badge, { backgroundColor: currentTheme.colors.error }]} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            }
                        />
                        <View style={[styles.searchContainer, { backgroundColor: currentTheme.colors.background }]}>
                            <PremiumSearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onClear={() => setSearchQuery('')}
                                placeholder="Search roles or companies..."
                            />
                        </View>

                        {(activeFilterCount > 0 || searchQuery) && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.chipScroll}
                                contentContainerStyle={styles.chipContent}
                            >
                                {filters.type && (
                                    <FilterChip label={CATEGORY_LABELS[filters.type] || filters.type} onRemove={() => setFilters({ type: null })} />
                                )}
                                {filters.tag && (
                                    <FilterChip label={filters.tag} onRemove={() => setFilters({ tag: null })} />
                                )}
                                {filters.workMode && (
                                    <FilterChip label={filters.workMode} onRemove={() => setFilters({ workMode: null })} />
                                )}
                                {filters.batchYear && (
                                    <FilterChip label={`${filters.batchYear} Batch`} onRemove={() => setFilters({ batchYear: null })} />
                                )}
                            </ScrollView>
                        )}
                    </View>
                }
                ListEmptyComponent={null}
                contentContainerStyle={[styles.scrollContent, { paddingTop: paddingTopOs + 20, paddingBottom: insets.bottom + 72 }]}
                showsVerticalScrollIndicator={false}
                onRefresh={onRefresh}
                refreshing={refreshing}
            />

            <FilterSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                filters={filters}
                onApply={setFilters}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    scrollContent: {
        // paddingBottom removed - now dynamic
    },
    searchContainer: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    discoverySection: {
        marginTop: 24,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.lg,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    categoryScroll: {
        paddingHorizontal: SPACING.lg,
        gap: 12,
    },
    categoryCard: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        marginRight: 4,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        gap: 8,
    },
    tagChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '700',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#020404',
    },
    chipScroll: {
        marginTop: 12,
        marginBottom: 4,
    },
    chipContent: {
        paddingHorizontal: SPACING.lg,
    },
    resultsHeader: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    resultsText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    cardWrapper: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    }
});

export default memo(ExploreScreen);
