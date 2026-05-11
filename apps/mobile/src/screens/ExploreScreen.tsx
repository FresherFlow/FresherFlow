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
import { Compass, Filter } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { OpportunityCard } from '@/system/components/OpportunityCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSaved } from '@repo/frontend-core';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { FilterSheet } from '@/system/components/FilterSheet';
import { FilterChip } from '@/system/components/FilterChip';
import { useExplore } from '@/hooks/useExplore';

type Props = NativeStackScreenProps<RootStackParamList, 'ExploreMain'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';

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

    // Track scroll position for animations and tab bar
    const scrollOffset = useRef(0);

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
        let text = `FOUND ${resultsCount} RESULTS`;
        if (searchQuery.trim()) text += ` FOR "${searchQuery.toUpperCase()}"`;
        else if (filters.type) {
            const label = filters.type === 'JOB' ? 'JOBS' : filters.type === 'INTERNSHIP' ? 'INTERNSHIPS' : 'WALK-INS';
            text = `FOUND ${resultsCount} ${label}`;
        }
        return text;
    };

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]}
                renderItem={({ item }) => (
                    <View style={styles.cardWrapper}>
                        <OpportunityCard 
                            opportunity={item} 
                            onPress={() => navigation.navigate('JobDetail', { opportunityId: item.id })} 
                            onSave={() => toggleSave(item)}
                            isSaved={isSaved(item.id)}
                        />
                    </View>
                )}
                ListHeaderComponent={
                    <View style={{ backgroundColor: currentTheme.colors.background }}>
                        <PremiumHeader 
                            title="Discovery" 
                            subtitle="Explore Opportunities" 
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
                        
                        {activeFilterCount > 0 && (
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={styles.chipScroll}
                                contentContainerStyle={styles.chipContent}
                            >
                                {filters.type && (
                                    <FilterChip label={filters.type} onRemove={() => setFilters({ type: null })} />
                                )}
                                {filters.workMode && (
                                    <FilterChip label={filters.workMode} onRemove={() => setFilters({ workMode: null })} />
                                )}
                                {filters.batchYear && (
                                    <FilterChip label={`${filters.batchYear} Batch`} onRemove={() => setFilters({ batchYear: null })} />
                                )}
                            </ScrollView>
                        )}
                        {!loading && resultsCount > 0 && (
                            <View style={styles.resultsHeader}>
                                <Text style={[styles.resultsText, { color: currentTheme.colors.textMuted }]}>
                                    {getResultsText()}
                                </Text>
                            </View>
                        )}
                    </View>
                }
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.scrollContent, { paddingTop: paddingTopOs + 20, paddingBottom: insets.bottom + 80 }]}
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
        paddingHorizontal: 20,
        marginTop: 4,
        marginBottom: 16,
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
        paddingHorizontal: 28,
    },
    resultsHeader: {
        paddingHorizontal: 28,
        marginTop: 12,
        marginBottom: 16,
    },
    resultsText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    cardWrapper: {
        paddingHorizontal: 20,
        marginBottom: 16,
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
