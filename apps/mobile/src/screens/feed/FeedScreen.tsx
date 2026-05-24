import React, { useCallback, memo, useState, useMemo, useRef, useEffect } from 'react';
import { MotiView } from 'moti';
import { FlashList } from '@shopify/flash-list';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform,
  BackHandler,
  ToastAndroid,
  ViewToken,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
    TrendingUp,
    Compass,
    Bell,
    Search,
    X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSaved } from '@repo/frontend-core';

import { useFeed } from '@/hooks/useFeed';
import { saveDetailCache } from '@/utils/offlineCache';
import { markJobAsSeen } from '@/utils/seenJobs';
import { Analytics, EventNames } from '@/utils/analytics';
import { clearUnseenCount } from '@/utils/localNotifications';
import { Opportunity } from '@fresherflow/types';
import { useNotifications } from '@/hooks/useNotifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { JobCard } from '@/system/components/OpportunityCard';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';
import { mScale, SPACING, RADIUS, SCREEN_WIDTH } from '@/system/constants/dimensions';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedList'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type FeedItem =
  | { type: 'stats'; count: number; key: string }
  | { type: 'opportunity'; data: Opportunity; index: number; key: string }
  | { type: 'skeleton'; key: string }
  | { type: 'empty'; key: string };

import { useUI } from '@/contexts/UIContext';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';

interface FeedTabContentProps {
    feedType: string | null;
    navigation: NativeStackScreenProps<RootStackParamList, 'FeedList'>['navigation'];
    currentTheme: AppTheme;
    isSaved: (id: string) => boolean;
    toggleSave: (opportunity: Opportunity) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleScroll?: any;
    searchQuery: string;
}

const FeedTabContent = memo(({ feedType: tabFeedType, navigation, currentTheme, isSaved, toggleSave, handleScroll, searchQuery }: FeedTabContentProps) => {
  const insets = useSafeAreaInsets();

  const {
    loading,
    refreshing,
    onRefresh,
    filteredOpportunities,
    loadMore,
    loadingMore,
    setSearchQuery,
    isBootstrapping,
    hasProfileData,
  } = useFeed(tabFeedType);

  // Sync search query from prop
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    viewableItems.forEach((viewable) => {
      const item = viewable.item as FeedItem;
      if (item.type === 'opportunity' && item.data?.id) {
        void markJobAsSeen(item.data.id);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Task 11: Clear unseen count when feed is active
      void clearUnseenCount();
    }, [])
  );

  const listData = useMemo(() => {
    const data: FeedItem[] = [];
    
    // Only show stats if we actually have items to show
    if (filteredOpportunities.length > 0) {
      data.push({ type: 'stats', count: filteredOpportunities.length, key: 'stats' });
    }

    if (loading && !refreshing && filteredOpportunities.length === 0) {
      [1, 2, 3].forEach(i => data.push({ type: 'skeleton', key: `skeleton-${i}` }));
    } else if (filteredOpportunities.length === 0) {
      data.push({ type: 'empty', key: 'empty' });
    } else {
      filteredOpportunities.forEach((item, index) => {
        data.push({ type: 'opportunity', data: item, index, key: `job-${item.id}-${index}` });
      });
    }

    return data;
  }, [loading, filteredOpportunities, refreshing]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'stats':
        if (item.count === 0) return null;
        return (
            <View style={styles.statsRow}>
                <View style={styles.statsLabel}>
                    <TrendingUp size={mScale(12)} color={currentTheme.colors.primary} />
                    <Text style={[styles.statsText, { color: currentTheme.colors.textMuted }]}>
                        <Text style={{ fontWeight: '800', color: currentTheme.colors.text }}>Showing</Text> {item.count} opportunities
                    </Text>
                </View>
                {isBootstrapping && (
                    <ActivityIndicator size="small" color={currentTheme.colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
                )}
            </View>
        );
      case 'opportunity':
        return (
            <JobCard
                opportunity={item.data}
                index={item.index}
                onPress={() => {
                    void saveDetailCache(item.data);
                    navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                }}
                onSave={() => toggleSave(item.data)}
                isSaved={isSaved(item.data.id)}
            />
        );
      case 'skeleton':
        return (
            <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.8 }}
                transition={{
                    type: 'timing',
                    duration: 1000,
                    loop: true,
                }}
                style={styles.skeletonCard}
            >
                <View style={styles.skeletonHeader}>
                    <View style={[styles.skeletonCircle, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]} />
                    <View style={{ flex: 1, gap: 8 }}>
                        <View style={[styles.skeletonLine, { width: '80%', backgroundColor: alpha(currentTheme.colors.text, 0.05) }]} />
                        <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: alpha(currentTheme.colors.text, 0.03) }]} />
                    </View>
                </View>
                <View style={[styles.skeletonLine, { width: '100%', marginTop: 20, backgroundColor: alpha(currentTheme.colors.text, 0.03) }]} />
            </MotiView>
        );
      case 'empty':
        return (
            <View style={styles.emptyContainer}>
                <Compass size={mScale(48)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>
                    {searchQuery ? "No results found" : "Community is quiet right now"}
                </Text>
                <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                    {searchQuery ? `We couldn't find anything for "${searchQuery}".` : "Try adjusting your filters or search keywords."}
                </Text>
                
                {searchQuery ? (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.ctaBtn, { backgroundColor: currentTheme.colors.primary, marginTop: 20 }]}
                        onPress={() => navigation.navigate('Share', { url: '' })}
                    >
                        <Text style={[styles.ctaText, { color: currentTheme.colors.background }]}>Share what you found</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ marginTop: SPACING.lg, width: '100%', alignItems: 'center' }}>
                        <Text style={{ fontSize: mScale(12), fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: SPACING.sm, letterSpacing: 0.5 }}>Trending Tags</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' }}>
                            {['Software Engineer', 'React', 'Remote', '2026 Batch', 'AI/ML'].map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    style={{
                                        paddingHorizontal: SPACING.md,
                                        paddingVertical: 10,
                                        borderRadius: RADIUS.lg,
                                        backgroundColor: alpha(currentTheme.colors.text, 0.05),
                                        borderWidth: 0.5,
                                        borderColor: alpha(currentTheme.colors.border, 0.3)
                                    }}
                                    onPress={() => setSearchQuery(tag)}
                                >
                                    <Text style={{ color: currentTheme.colors.text, fontSize: mScale(13), fontWeight: '500' }}>{tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
      default:
        return null;
    }
  }, [currentTheme, navigation, isSaved, toggleSave, isBootstrapping, searchQuery, tabFeedType, hasProfileData]);

  
  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        <FlashList<FeedItem>
            data={listData}
            renderItem={renderItem}
            extraData={{ isBootstrapping, searchQuery, tabFeedType, hasProfileData }}
            keyExtractor={(item) => item.key}
            // @ts-expect-error - FlashList typing bug with estimatedItemSize
            estimatedItemSize={180}
            drawDistance={2500}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + mScale(60) }]}
            onEndReached={loadMore}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            refreshControl={
                <PremiumRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
                <UsernameNudgeCard />
            }
            ListFooterComponent={
                loadingMore ? <ActivityIndicator style={{ margin: SPACING.md }} color={currentTheme.colors.primary} /> : null
            }
        />
    </View>
  );
});

const FeedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { showSuccess } = useToast();
  const { isSaved, toggleSave } = useSaved();
  const { hideTabBar, showTabBar } = useUI();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  const tabListRef = useRef<ScrollView>(null);
  // Indicator position — springs to new tab after swipe lands (no per-frame JS bridge cost)
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchQuery.length >= 3) {
        const timer = setTimeout(() => {
            Analytics.trackEvent(EventNames.SEARCH_PERFORMED, { query: searchQuery });
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const toggleSearch = useCallback(() => {
    if (isSearching) {
        setSearchQuery('');
        setIsSearching(false);
    } else {
        setIsSearching(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isSearching]);

  useFocusEffect(
    useCallback(() => {
        void clearUnseenCount();

        // Handle back button to exit app on feed
        let backPressCount = 0;
        const onBackPress = () => {
            if (backPressCount === 0) {
                backPressCount++;
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
                }
                setTimeout(() => {
                    backPressCount = 0;
                }, 2000);
                return true; // Handled
            }
            BackHandler.exitApp();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [])
  );

  // Tab indicator animations
  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number}}>({});

  const feeds = [
    { id: null, label: 'For You' },
    { id: 'trending', label: 'Trending' },
    { id: 'remote', label: 'Remote' },
    { id: '2026', label: '2026 Batch' },
    { id: 'internships', label: 'Internships' },
  ];


  // Initialize indicator position on first layout
  useEffect(() => {
    if (tabLayouts[activeTab] && (indicatorWidth as unknown as number) !== 0) {
      indicatorLeft.setValue(tabLayouts[activeTab].x);
      indicatorWidth.setValue(tabLayouts[activeTab].width);
    }
  }, [tabLayouts, activeTab]);

  // Ensure tab bar is visible when switching tabs
  useEffect(() => {
    showTabBar();
    Analytics.trackEvent(EventNames.FILTER_CHANGED, { tab: feeds[activeTab].label });
  }, [activeTab]);

  const scrollOffset = useRef(0);
  const isTabBarVisible = useRef(true);

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

    if (Math.abs(currentOffset - scrollOffset.current) > 30) {
        if (direction === 'down' && currentOffset > 100 && isTabBarVisible.current) {
            isTabBarVisible.current = false;
            hideTabBar();
        } else if ((direction === 'up' || currentOffset < 50) && !isTabBarVisible.current) {
            isTabBarVisible.current = true;
            showTabBar();
        }
        scrollOffset.current = currentOffset;
    }
  }, [hideTabBar, showTabBar]);

  const handleToggleSave = useCallback((opportunity: Opportunity) => {
    const wasSaved = isSaved(opportunity.id);
    toggleSave(opportunity);
    showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
  }, [isSaved, toggleSave, showSuccess]);

  const onPagerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const progress = offsetX / SCREEN_WIDTH;
    
    // 1. Sync indicator perfectly with scroll
    const lowerIndex = Math.floor(progress);
    const upperIndex = Math.ceil(progress);
    const fraction = progress - lowerIndex;

    if (tabLayouts[lowerIndex] && tabLayouts[upperIndex]) {
        const lowerLayout = tabLayouts[lowerIndex];
        const upperLayout = tabLayouts[upperIndex];
        
        const currentLeft = lowerLayout.x + (upperLayout.x - lowerLayout.x) * fraction;
        const currentWidth = lowerLayout.width + (upperLayout.width - lowerLayout.width) * fraction;
        
        indicatorLeft.setValue(currentLeft);
        indicatorWidth.setValue(currentWidth);
    }

    // 2. Update active tab text when halfway across
    const index = Math.round(progress);
    if (index >= 0 && index < feeds.length && index !== activeTab) {
        setActiveTab(index);
        
        // Scroll the tab list itself to keep the active tab visible
        if (tabLayouts[index] && tabListRef.current) {
            const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
            tabListRef.current.scrollTo({ x: Math.max(0, centerOffset), animated: true });
        }
    }
  }, [tabLayouts, activeTab]);

  const handleTabPress = useCallback((index: number) => {
    if (index === activeTab) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pagerRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
  }, [activeTab]);

    return (
    <Screen safe={false}>
      <View style={{ 
          backgroundColor: currentTheme.colors.background,
      }}>
        <View style={{ paddingTop: insets.top + 4 }}>
            <PremiumHeader
                title={isSearching ? "" : "FresherFlow"}
                subtitle={isSearching ? undefined : "Opportunities for You"}
                style={{ paddingBottom: 4 }}
                leftSlot={isSearching ? (
                    <View style={[styles.searchContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                        <Search size={18} color={currentTheme.colors.textMuted} />
                        <TextInput
                            ref={searchInputRef}
                            style={[styles.searchInput, { color: currentTheme.colors.text }]}
                            placeholder="Search roles, companies..."
                            placeholderTextColor={currentTheme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            autoFocus={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color={currentTheme.colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : null}
                rightSlot={
                    <View style={styles.headerActions}>
                        <TouchableOpacity 
                            onPress={toggleSearch}
                            style={styles.actionBtn}
                        >
                            {isSearching ? (
                                <Text style={[styles.cancelText, { color: currentTheme.colors.primary }]}>Cancel</Text>
                            ) : (
                                <Search size={24} color={currentTheme.colors.text} />
                            )}
                        </TouchableOpacity>
                        {!isSearching && (
                            <TouchableOpacity 
                                onPress={() => navigation.navigate('Notifications')}
                                style={styles.notificationBtn}
                            >
                                <Bell size={24} color={currentTheme.colors.text} />
                                {unreadCount > 0 && (
                                    <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <View style={styles.feedSelector}>
                <ScrollView
                    ref={tabListRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.feedList}
                    keyboardShouldPersistTaps="always"
                >
                    {feeds.map((feed, index) => {
                        const isActive = activeTab === index;
                        const tabKey = `tab-${feed.id || 'all'}-${index}`;
                        return (
                            <TouchableOpacity
                                key={tabKey}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onLayout={(e) => {
                                    const { x, width } = e.nativeEvent.layout;
                                    setTabLayouts(prev => ({ ...prev, [index]: { x, width } }));
                                }}
                                style={styles.feedTab}
                                onPress={() => handleTabPress(index)}
                            >
                                <Text style={[
                                    styles.feedTabText,
                                    {
                                        color: isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted,
                                        opacity: isActive ? 1 : 0.55,
                                    }
                                ]}>
                                    {feed.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            {
                                backgroundColor: currentTheme.colors.primary,
                                left: indicatorLeft,
                                width: indicatorWidth,
                            }
                        ]}
                    />
                </ScrollView>
            </View>
        </View>
      </View>

      <FlatList
        ref={pagerRef}
        horizontal
        pagingEnabled
        data={feeds}
        keyExtractor={(f, index) => `pager-${f.id || 'all'}-${index}`}
        showsHorizontalScrollIndicator={false}
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
        })}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        renderItem={({ item }) => (
            <FeedTabContent
                feedType={item.id}
                navigation={navigation}
                currentTheme={currentTheme}
                isSaved={isSaved}
                toggleSave={handleToggleSave}
                handleScroll={handleScroll}
                searchQuery={searchQuery}
            />
        )}
      />
    </Screen>
  );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
        backgroundColor: 'transparent', // Screen will handle background
    },
    scrollContent: {
        paddingTop: SPACING.sm,
    },
    feedSelector: {
        marginBottom: 0,
    },
    feedList: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    feedTab: {
        paddingVertical: 8,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        borderRadius: 1,
    },
    feedTabText: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    notificationBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -SPACING.sm,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: mScale(14),
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        width: SCREEN_WIDTH - 110,
        marginLeft: -8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        padding: 0,
    },
    themeBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        marginTop: SPACING.md,
    },
    statsLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statsText: {
        fontSize: mScale(11),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    skeletonCard: {
        height: mScale(140),
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skeletonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    skeletonLine: {
        height: 16,
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        gap: SPACING.md,
    },
    emptyTitle: {
        fontSize: mScale(20),
        fontWeight: '900',
    },
    emptySub: {
        fontSize: mScale(14),
        textAlign: 'center',
        lineHeight: mScale(20),
    },
    emptyIconBox: {
        width: mScale(80),
        height: mScale(80),
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    ctaBtn: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: 14,
        borderRadius: RADIUS.lg,
        marginTop: SPACING.md,
    },
    ctaText: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});

export default FeedScreen;
