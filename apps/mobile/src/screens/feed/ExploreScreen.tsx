import React, { memo, useCallback, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';

import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Animated,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Filter, Building2, ChevronRight, X, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { SurfaceCard, PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { FilterSheet, FilterSheetRef } from '@/system/components/FilterSheet';
import { FilterChip } from '@/system/components/FilterChip';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';
import { SPACING } from '@/system/constants/dimensions';
import { useExplore } from '@/hooks/useExplore';
import { saveRecentSearchKeyword } from '@/utils/userBehavior';
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
  | { type: 'empty'; key: string }
  | { type: 'loading'; key: string };



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
    const { isSaved, toggleSave, savedJobs } = useSaved();
    const { hideTabBar, showTabBar } = useUI();
    const {
        results,
        loading,
        refreshing,
        onRefresh,
        filters,
        setFilters,
        searchQuery,
        setSearchQuery,
        suggestions
    } = useExplore();

    const filterSheetRef = React.useRef<FilterSheetRef>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flashListRef = React.useRef<any>(null);
    useScrollToTop(flashListRef);
    const [showScrollTop, setShowScrollTop] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'opportunities' | 'companies'>('opportunities');

    // Scroll back to top on search query, filter change, or view mode toggle
    React.useEffect(() => {
        try {
            flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch {
            // Guard against unmounted/loading state
        }
    }, [filters, viewMode, searchQuery]);



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

    const { showSuccess } = useToast();

    // Track scroll position for animations and tab bar
    const scrollOffset = useRef(0);

    const handleScroll = useCallback((event: any) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        setShowScrollTop(currentOffset > 600);
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

        if (Math.abs(currentOffset - scrollOffset.current) > 20) {
            if (direction === 'down' && currentOffset > 100) {
                hideTabBar();
            } else if (direction === 'up' || currentOffset < 50) {
                showTabBar();
            }
            scrollOffset.current = currentOffset;
        }
    }, [hideTabBar, showTabBar]);

    const handleToggleSave = useCallback((opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    }, [isSaved, toggleSave, showSuccess]);

    const resultsCount = results.length;

    const activeFilterCount = (filters.types?.length || 0) + (filters.workModes?.length || 0) + (filters.batchYears?.length || 0) + (filters.tag ? 1 : 0);

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
                                setFilters({ types: [], tag: null, workModes: [], batchYears: [] });
                                setSearchQuery('');
                            }}
                        >
                            <Text style={{ color: currentTheme.colors.primary, fontWeight: '700' }}>Clear all filters</Text>
                        </TouchableOpacity>
                    )}

                    {suggestions.length > 0 && (
                        <View style={{ marginTop: 40, width: '100%' }}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: currentTheme.colors.textMuted, marginBottom: 16, letterSpacing: 1.5, textAlign: 'center', opacity: 0.6 }}>
                                DID YOU MEAN?
                            </Text>
                            {suggestions.map((s, idx) => (
                                <JobCard
                                    key={`suggestion-${s.id}`}
                                    opportunity={s}
                                    index={idx}
                                    onPress={() => {
                                        requestAnimationFrame(() => {
                                            navigation.navigate('JobDetail', { opportunity: s, opportunityId: s.id });
                                        });
                                    }}
                                    onSave={() => handleToggleSave(s)}
                                    isSaved={isSaved(s.id)}
                                />
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    ), [loading, currentTheme, suggestions, isSaved, handleToggleSave, navigation, setFilters, setSearchQuery, activeFilterCount, searchQuery]);

    const getResultsText = () => {
        if (viewMode === 'companies') return `Found ${derivedCompanies.length} companies`;
        if (!searchQuery && activeFilterCount === 0) return `Recent Opportunities`;
        let text = `Found ${resultsCount} results`;
        if (searchQuery.trim()) text += ` for "${searchQuery}"`;
        else if (filters.types && filters.types.length > 0) {
            const labels = filters.types.map(t => t === 'JOB' ? 'jobs' : t === 'INTERNSHIP' ? 'internships' : 'walk-ins').join(', ');
            text = `Found ${resultsCount} ${labels}`;
        } else if (filters.tag) {
            text = `Found ${resultsCount} for ${filters.tag}`;
        }
        return text;
    };

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <View 
                style={{ 
                    backgroundColor: currentTheme.colors.background,
                }}
            >
            <View style={{ paddingTop: insets.top + 30 }}>
                <PremiumHeader
                    title="Discover"
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
                            {filters.types && filters.types.map(t => (
                                <FilterChip key={t} label={CATEGORY_LABELS[t] || t} onRemove={() => setFilters({ types: filters.types.filter(x => x !== t) })} />
                            ))}
                            {filters.tag && (
                                <FilterChip label={filters.tag} onRemove={() => setFilters({ tag: null })} />
                            )}
                            {filters.workModes && filters.workModes.map(w => (
                                <FilterChip key={w} label={w} onRemove={() => setFilters({ workModes: filters.workModes.filter(x => x !== w) })} />
                            ))}
                            {filters.batchYears && filters.batchYears.map(y => (
                                <FilterChip key={y} label={`${y} Batch`} onRemove={() => setFilters({ batchYears: filters.batchYears.filter(x => x !== y) })} />
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>

            <FlashList<ExploreItem>
                ref={flashListRef}
                extraData={{ savedJobs, isSaved }}
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
                        } else if (loading) {
                            items.push({ type: 'loading', key: 'loading_state' });
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
                    } else if (loading) {
                        items.push({ type: 'loading', key: 'loading_state' });
                    }

                    return items;
                })()}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={180}
                drawDistance={2500}
                getItemType={(item) => item.type}
                keyExtractor={(item) => item.key}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                renderItem={({ item, index }) => {

                    if (item.type === 'discovery') {
                        return (
                            <>
                                <View style={[styles.discoverySection, { marginTop: 0 }]}>
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
                                                    if (filters.types?.includes(cat) && viewMode === 'opportunities') {
                                                        setFilters({ types: filters.types.filter(x => x !== cat) });
                                                    } else {
                                                        setViewMode('opportunities');
                                                        setFilters({ types: [...(filters.types || []), cat] });
                                                        // Intercept and store high-intent category selection interest
                                                        const label = CATEGORY_LABELS[cat] || cat;
                                                        if (label.length >= 3) {
                                                            saveRecentSearchKeyword(label.toLowerCase());
                                                        }
                                                    }
                                                }}
                                                style={[styles.categoryCard, {
                                                    backgroundColor: (viewMode === 'opportunities' && filters.types?.includes(cat)) ? currentTheme.colors.primary : alpha(currentTheme.colors.primary, 0.05),
                                                    borderWidth: 1,
                                                    borderColor: (viewMode === 'opportunities' && filters.types?.includes(cat)) ? currentTheme.colors.primary : 'transparent',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }]}
                                            >
                                                <Text style={[styles.categoryLabel, { color: (viewMode === 'opportunities' && filters.types?.includes(cat)) ? currentTheme.colors.background : currentTheme.colors.primary }]}>
                                                    {CATEGORY_LABELS[cat] || cat}
                                                </Text>
                                                {(viewMode === 'opportunities' && filters.types?.includes(cat)) && (
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
                                        {CONTROLLED_TAGS.BATCHES.map(tag => (
                                            <TouchableOpacity
                                                key={tag}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    if (filters.tag === tag && viewMode === 'opportunities') {
                                                        setFilters({ tag: null });
                                                    } else {
                                                        setViewMode('opportunities');
                                                        setFilters({ tag });
                                                        // Intercept and store high-intent tag click behavior
                                                        if (tag.length >= 3) {
                                                            saveRecentSearchKeyword(tag.toLowerCase());
                                                        }
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

                    if (item.type === 'loading') {
                        return (
                            <View style={{ paddingTop: 60, alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                            </View>
                        );
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
                                    requestAnimationFrame(() => {
                                        navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                                    });
                                }}
                                onSave={() => handleToggleSave(item.data)}
                                isSaved={isSaved(item.data.id)}
                            />
                        );
                    }

                    return null;
                }}
                ListHeaderComponent={<UsernameNudgeCard />}
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

            {showScrollTop && (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}
                    style={[
                        styles.scrollTopBtn,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            borderColor: alpha(currentTheme.colors.border, 0.3),
                            bottom: insets.bottom + 110,
                        },
                    ]}
                >
                    <ChevronUp size={20} color={currentTheme.colors.primary} />
                </TouchableOpacity>
            )}
        </Screen>
    );
});

const styles = StyleSheet.create({
    // stickyHeader removed as it is unused
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
        // borderColor removed as it is overridden dynamically
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
    },
    scrollTopBtn: {
        position: 'absolute',
        right: 28,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        zIndex: 9999,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    }
});

export default memo(ExploreScreen);
