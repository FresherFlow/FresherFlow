import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
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
import { Shield, Filter, ChevronRight, X, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useScrollToTop } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { GovtJobCard } from '@/system/components/GovtJobCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSaved } from '@repo/frontend-core';
import { SurfaceCard, PremiumHeader } from '@/system/components/PremiumPrimitives';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { GovtFilterSheet, FilterSheetRef } from '@/system/components/GovtFilterSheet';
import { FilterChip } from '@/system/components/FilterChip';
import { SPACING, RADIUS } from '@/system/constants/dimensions';
import { useGovtExplore, GovtExploreFilters } from '@/hooks/useGovtExplore';
import { Opportunity } from '@fresherflow/types';
import { useToast } from '@/contexts/ToastContext';
import { alpha } from '@/theme';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useUI } from '@/contexts/UIContext';
import { useFeedStore } from '@/store/useFeedStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ExploreMain'>;

type ExploreItem =
  | { type: 'stats'; key: string; count: number }
  | { type: 'opportunity'; data: Opportunity; key: string }
  | { type: 'discovery'; key: string }
  | { type: 'empty'; key: string }
  | { type: 'loading'; key: string };

const GOVT_CATEGORIES = ['SSC', 'UPSC', 'Banking', 'Railways', 'Defence', 'State PSC', 'Teaching'];

const GovtExploreScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { hideTabBar, showTabBar } = useUI();
    const { isBootstrapping } = useFeedStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<GovtExploreFilters>({
        govLevels: [],
        govStatuses: [],
        education: null,
        sort: 'latest',
        tag: null,
    });

    const results = useGovtExplore(searchQuery, filters);

    const filterSheetRef = React.useRef<FilterSheetRef>(null);
    const flashListRef = React.useRef<any>(null);
    
    const scrollOffset = useRef(0);

    const smoothScrollToTop = useCallback(() => {
        if (!flashListRef.current) return;
        
        if (scrollOffset.current > 2000) {
            flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } else {
            flashListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, []);

    const scrollToTopRef = useRef({ scrollToTop: smoothScrollToTop });
    useScrollToTop(scrollToTopRef);
    
    const [showScrollTop, setShowScrollTop] = React.useState(false);

    React.useEffect(() => {
        try {
            smoothScrollToTop();
        } catch {
            // Guard against unmounted/loading state
        }
    }, [filters, searchQuery, smoothScrollToTop]);

    const { showSuccess } = useToast();

    const handleScroll = useCallback((event: any) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

        if (currentOffset > 600) {
            if (Math.abs(currentOffset - scrollOffset.current) > 10) {
                setShowScrollTop(direction === 'up');
            }
        } else {
            setShowScrollTop(false);
        }

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
    const activeFilterCount = (filters.govLevels?.length || 0) + (filters.govStatuses?.length || 0) + (filters.tag ? 1 : 0);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <View style={{ paddingHorizontal: 40, alignItems: 'center', width: '100%' }}>
                <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                    <Shield size={48} color={currentTheme.colors.primary} />
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
                            setFilters({ govLevels: [], govStatuses: [], education: null, sort: 'latest', tag: null });
                            setSearchQuery('');
                        }}
                    >
                        <Text style={{ color: currentTheme.colors.primary, fontWeight: '700' }}>Clear search & filters</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    ), [currentTheme, activeFilterCount, searchQuery]);

    const getResultsText = () => {
        if (!searchQuery && activeFilterCount === 0) return `Recent Announcements`;
        let text = `Found ${resultsCount} results`;
        if (searchQuery.trim()) text += ` for "${searchQuery}"`;
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
                            placeholder="Search exams, recruiting bodies..."
                        />
                    </View>

                    {(activeFilterCount > 0 || searchQuery) && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                            contentContainerStyle={styles.chipContent}
                        >
                            {filters.govLevels?.map(l => (
                                <FilterChip key={l} label={l} onRemove={() => setFilters(prev => ({ ...prev, govLevels: prev.govLevels.filter(x => x !== l) }))} />
                            ))}
                            {filters.tag && (
                                <FilterChip label={filters.tag} onRemove={() => setFilters(prev => ({ ...prev, tag: null }))} />
                            )}
                            {filters.govStatuses?.map(s => (
                                <FilterChip key={s} label={s} onRemove={() => setFilters(prev => ({ ...prev, govStatuses: (prev.govStatuses || []).filter(x => x !== s) }))} />
                            ))}
                            {filters.education && (
                                <FilterChip label={filters.education} onRemove={() => setFilters(prev => ({ ...prev, education: null }))} />
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>

            <FlashList<ExploreItem>
                ref={flashListRef}
                extraData={{ results, isSaved }}
                data={(() => {
                    const items: ExploreItem[] = [];

                    const showDiscovery = !searchQuery && !filters.tag && activeFilterCount === 0;

                    if (showDiscovery) {
                        items.push({ type: 'discovery', key: 'discovery' });
                    }

                    if (resultsCount > 0) {
                        items.push({ type: 'stats', key: 'results_stats', count: resultsCount });
                        results.forEach((r, idx) => {
                            items.push({ type: 'opportunity', data: r, key: `${r.id}_${idx}` });
                        });
                    } else if (isBootstrapping) {
                        items.push({ type: 'loading', key: 'loading_state' });
                    } else if (!showDiscovery) {
                        items.push({ type: 'empty', key: 'empty_state' });
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
                            <View style={[styles.discoverySection, { marginTop: 0 }]}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Browse Categories</Text>
                                </View>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.categoryScroll}
                                >
                                    {GOVT_CATEGORIES.map((cat) => {
                                        const isSelected = filters.tag === cat;
                                        return (
                                            <TouchableOpacity
                                                key={cat}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setFilters(prev => ({
                                                        ...prev,
                                                        tag: prev.tag === cat ? null : cat
                                                    }));
                                                }}
                                                style={[styles.categoryCard, {
                                                    backgroundColor: isSelected ? currentTheme.colors.primary : alpha(currentTheme.colors.primary, 0.05),
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? currentTheme.colors.primary : 'transparent',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }]}
                                            >
                                                <Text style={[styles.categoryLabel, { color: isSelected ? currentTheme.colors.background : currentTheme.colors.primary }]}>
                                                    {cat}
                                                </Text>
                                                {isSelected && (
                                                    <X size={14} color={currentTheme.colors.background} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
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

                    if (item.type === 'opportunity') {
                        return (
                            <GovtJobCard
                                opportunity={item.data}
                                index={index}
                                onPress={() => {
                                    requestAnimationFrame(() => {
                                        navigation.navigate('GovtJobDetail', { opportunity: item.data, opportunityId: item.data.id });
                                    });
                                }}
                                onSave={() => handleToggleSave(item.data)}
                                isSaved={isSaved(item.data.id)}
                            />
                        );
                    }

                    return null;
                }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 72 }}
                showsVerticalScrollIndicator={false}
            />

            <GovtFilterSheet
                ref={filterSheetRef}
                filters={{
                    levels: filters.govLevels,
                    statuses: filters.govStatuses,
                    education: filters.education,
                    sort: filters.sort,
                }}
                onApply={(applied) => {
                    setFilters(prev => ({
                        ...prev,
                        govLevels: applied.levels || [],
                        govStatuses: applied.statuses || [],
                        education: applied.education || null,
                        sort: applied.sort || 'latest',
                    }));
                }}
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
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
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

export default memo(GovtExploreScreen);
