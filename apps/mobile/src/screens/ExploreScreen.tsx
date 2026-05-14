import React, { memo, useCallback, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';

import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Filter, Building2, ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { SurfaceCard, PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { FilterSheet, FilterSheetRef } from '@/system/components/FilterSheet';
import { FilterChip } from '@/system/components/FilterChip';
import { SPACING } from '@/system/constants/dimensions';
import { useExplore } from '@/hooks/useExplore';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { CORE_CATEGORIES, CONTROLLED_TAGS, CATEGORY_LABELS } from '@fresherflow/constants';
import { useToast } from '@/contexts/ToastContext';
import { alpha } from '@/theme';
import { toTitleCase } from '@/utils/text';
import { TYPOGRAPHY } from '@/system/constants/typography';

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
                                {company.opportunityCount} {company.opportunityCount === 1 ? 'Job' : 'Jobs'}
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

    const filterSheetRef = React.useRef<FilterSheetRef>(null);
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
                    {(activeFilterCount > 0 || searchQuery.trim() !== '') && (
                        <TouchableOpacity 
                            style={[styles.clearEmptyBtn, { borderColor: currentTheme.colors.primary }]}
                            onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setFilters({ type: null, tag: null, workMode: null, batchYear: null });
                                setSearchQuery('');
                            }}
                        >
                            <Text style={{ color: currentTheme.colors.primary, fontWeight: '700' }}>Clear all filters</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    ), [loading, currentTheme]);



    const activeFilterCount = (filters.type ? 1 : 0) + (filters.workMode ? 1 : 0) + (filters.batchYear ? 1 : 0) + (filters.tag ? 1 : 0);

    const getResultsText = () => {
        if (viewMode === 'companies') return `Found ${derivedCompanies.length} companies`;
        if (!searchQuery && activeFilterCount === 0) return `Recent Opportunities`;
        let text = `Found ${resultsCount} results`;
        if (searchQuery.trim()) text += ` for "${searchQuery}"`;
        else if (filters.type) {
            const label = filters.type === 'JOB' ? 'jobs' : filters.type === 'INTERNSHIP' ? 'internships' : 'walk-ins';
            text = `Found ${resultsCount} ${label}`;
        } else if (filters.tag) {
            text = `Found ${resultsCount} for ${filters.tag}`;
        }
        return text;
    };

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={{ backgroundColor: currentTheme.colors.background, paddingTop: insets.top + 10 }}>
                <PremiumHeader
                    title="Discovery"
                    subtitle="Explore Opportunities"
                    style={{ paddingBottom: 0 }}
                    rightSlot={
                        <TouchableOpacity
                            onPress={() => {
                                console.log('[ExploreScreen] Opening FilterSheet via Ref');
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                filterSheetRef.current?.present();
                            }}
                            style={[styles.filterBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                        >
                            <View>
                                <Filter size={20} color={currentTheme.colors.primary} />
                                {activeFilterCount > 0 && (
                                    <View style={[styles.badge, { backgroundColor: currentTheme.colors.error, borderColor: currentTheme.colors.background }]} />
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
                <View style={{ height: 8 }} />
            </View>

            <FlashList<ExploreItem>
                data={(() => {
                    const items: ExploreItem[] = [];

                    if (viewMode === 'companies') {
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

                    const showDiscovery = !searchQuery && !filters.tag && activeFilterCount === 0;

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
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={160}
                keyExtractor={(item) => item.key}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => {

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
                                            onPress={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setViewMode(viewMode === 'companies' ? 'opportunities' : 'companies');
                                            }}
                                            style={[styles.categoryCard, {
                                                backgroundColor: viewMode === 'companies' ? currentTheme.colors.success : alpha(currentTheme.colors.success, 0.05),
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 8,
                                                borderWidth: 1,
                                                borderColor: viewMode === 'companies' ? currentTheme.colors.success : 'transparent'
                                            }]}
                                        >
                                            <Building2 size={16} color={viewMode === 'companies' ? currentTheme.colors.background : currentTheme.colors.success} />
                                            <Text style={[styles.categoryLabel, { color: viewMode === 'companies' ? currentTheme.colors.background : currentTheme.colors.success }]}>
                                                Companies
                                            </Text>
                                            {viewMode === 'companies' && (
                                                <X size={14} color={currentTheme.colors.background} />
                                            )}
                                        </TouchableOpacity>

                                        {CORE_CATEGORIES.map((cat: OpportunityType) => (
                                            <TouchableOpacity
                                                key={cat}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    if (filters.type === cat && viewMode === 'opportunities') {
                                                        setFilters({ type: null });
                                                    } else {
                                                        setViewMode('opportunities');
                                                        setFilters({ type: cat });
                                                    }
                                                }}
                                                style={[styles.categoryCard, {
                                                    backgroundColor: (viewMode === 'opportunities' && filters.type === cat) ? currentTheme.colors.primary : alpha(currentTheme.colors.primary, 0.05),
                                                    borderWidth: 1,
                                                    borderColor: (viewMode === 'opportunities' && filters.type === cat) ? currentTheme.colors.primary : 'transparent',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }]}
                                            >
                                                <Text style={[styles.categoryLabel, { color: (viewMode === 'opportunities' && filters.type === cat) ? currentTheme.colors.background : currentTheme.colors.primary }]}>
                                                    {CATEGORY_LABELS[cat] || cat}
                                                </Text>
                                                {(viewMode === 'opportunities' && filters.type === cat) && (
                                                    <X size={14} color={currentTheme.colors.background} />
                                                )}
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
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    if (filters.tag === tag && viewMode === 'opportunities') {
                                                        setFilters({ tag: null });
                                                    } else {
                                                        setViewMode('opportunities');
                                                        setFilters({ tag });
                                                    }
                                                }}
                                                style={[styles.tagChip, {
                                                    backgroundColor: (viewMode === 'opportunities' && filters.tag === tag) ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05),
                                                    borderWidth: 1,
                                                    borderColor: (viewMode === 'opportunities' && filters.tag === tag) ? currentTheme.colors.primary : 'transparent',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }]}
                                            >
                                                <Text style={[styles.tagText, { 
                                                    color: (viewMode === 'opportunities' && filters.tag === tag) ? currentTheme.colors.background : currentTheme.colors.text 
                                                }]}>
                                                    {toTitleCase(tag)}
                                                </Text>
                                                {(viewMode === 'opportunities' && filters.tag === tag) && (
                                                    <X size={14} color={currentTheme.colors.background} />
                                                )}
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

                    if (item.type === 'opportunity') {
                        return (
                            <JobCard
                                opportunity={item.data}
                                index={index}
                                onPress={() => {
                                    void saveDetailCache(item.data);
                                    navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                                }}
                                onSave={() => handleToggleSave(item.data)}
                                isSaved={isSaved(item.data.id)}
                            />
                        );
                    }

                    return null;
                }}
                ListEmptyComponent={null}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 72 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <PremiumRefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            />

            <FilterSheet
                ref={filterSheetRef}
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
        borderBottomColor: '#000', // Static fallback
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
        ...TYPOGRAPHY.sectionTitle,
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
        borderColor: '#000', // Static fallback
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
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
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
    clearEmptyBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
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
