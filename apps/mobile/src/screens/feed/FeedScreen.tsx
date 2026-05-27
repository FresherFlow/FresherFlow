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
  InteractionManager,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import {
    TrendingUp,
    Compass,
    Bell,
    Search,
    X,
    ChevronUp,
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
    savedJobs: Opportunity[];
}

const FeedTabContent = memo(({ feedType: tabFeedType, navigation, currentTheme, isSaved, toggleSave, handleScroll, searchQuery, savedJobs }: FeedTabContentProps) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef<any>(null);
  useScrollToTop(listRef);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const localHandleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    setShowScrollTop(currentOffset > 600);
    if (handleScroll) {
      handleScroll(event);
    }
  }, [handleScroll]);

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
    
    // If we are bootstrapping on app launch, show skeletons instead of flashing old cache
    if (loading && !refreshing) {
      [1, 2, 3].forEach(i => data.push({ type: 'skeleton', key: `skeleton-${i}` }));
      return data;
    }

    // Only show stats if we actually have items to show
    if (filteredOpportunities.length > 0) {
      data.push({ type: 'stats', count: filteredOpportunities.length, key: 'stats' });
    }

    if (filteredOpportunities.length === 0) {
      data.push({ type: 'empty', key: 'empty' });
    } else {
      const seenIds = new Set<string>();
      filteredOpportunities.forEach((item, index) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          data.push({ type: 'opportunity', data: item, index, key: `job-${item.id}` });
        }
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
                    requestAnimationFrame(() => {
                        navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                    });
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
                style={[styles.skeletonCard, { backgroundColor: currentTheme.colors.surfaceDarkSubtle }]}
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
                    {searchQuery ? `We couldn't find anything for "${searchQuery}".` : "No live opportunities have been shared today yet."}
                </Text>
                
                {searchQuery && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.ctaBtn, { backgroundColor: currentTheme.colors.primary, marginTop: 20 }]}
                        onPress={() => navigation.navigate('Share', { url: '' })}
                    >
                        <Text style={[styles.ctaText, { color: currentTheme.colors.background }]}>Share what you found</Text>
                    </TouchableOpacity>
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
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            extraData={{ searchQuery, savedJobs }}
            keyExtractor={(item) => item.key}
            // @ts-expect-error - FlashList typing bug with estimatedItemSize
            estimatedItemSize={180}
            drawDistance={600}
            removeClippedSubviews={true}
            windowSize={3}
            maxToRenderPerBatch={5}
            initialNumToRender={5}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + mScale(60) }]}
            onEndReached={loadMore}
            onScroll={localHandleScroll}
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

        {showScrollTop && (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    listRef.current?.scrollToOffset({ offset: 0, animated: true });
                }}
                style={[
                    styles.scrollTopBtn,
                    {
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: alpha(currentTheme.colors.border, 0.3),
                        bottom: insets.bottom + mScale(100),
                    },
                ]}
            >
                <ChevronUp size={20} color={currentTheme.colors.primary} />
            </TouchableOpacity>
        )}
    </View>
  );
});

const FeedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { showSuccess } = useToast();
  const { isSaved, toggleSave, savedJobs } = useSaved();
  const { hideTabBar, showTabBar } = useUI();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const pagerRef = useRef<PagerView>(null);
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
  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number, center: number}}>({});

  const feeds = [
    { id: null, label: 'For You' },
    // { id: 'profile', label: 'Profile' },
    { id: 'trending', label: 'Trending' },
    { id: 'remote', label: 'Remote' },
    { id: '2026', label: '2026 Batch' },
    { id: 'internships', label: 'Internships' },
  ];


  // Animate indicator position smoothly when active tab changes
  useEffect(() => {
    if (tabLayouts[activeTab]) {
      Animated.parallel([
          Animated.spring(indicatorLeft, {
              toValue: tabLayouts[activeTab].center || tabLayouts[activeTab].x,
              useNativeDriver: true,
              bounciness: 0,
              speed: 14,
          }),
          Animated.spring(indicatorWidth, {
              toValue: tabLayouts[activeTab].width,
              useNativeDriver: true,
              bounciness: 0,
              speed: 14,
          })
      ]).start();
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
    showSuccess(wasSaved ? 'Opportunity removed from saved' : 'Opportunity saved successfully!');
  }, [isSaved, toggleSave, showSuccess]);





  const handlePageSelected = useCallback((index: number) => {
    if (index >= 0 && index < feeds.length && index !== activeTabRef.current) {
        activeTabRef.current = index;

        requestAnimationFrame(() => {
            setActiveTab(index);
        });
        
        // Scroll the tab list itself to keep the active tab visible
        if (tabLayouts[index] && tabListRef.current) {
            const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
            tabListRef.current.scrollTo({ x: Math.max(0, centerOffset), animated: true });
        }
    }
  }, [tabLayouts, feeds.length]);

  const handleTabPress = useCallback((index: number) => {
    if (index === activeTabRef.current) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    activeTabRef.current = index;
    setActiveTab(index);

    pagerRef.current?.setPage(index);

    if (tabLayouts[index] && tabListRef.current) {
        const centerOffset =
            tabLayouts[index].x -
            (SCREEN_WIDTH / 2) +
            (tabLayouts[index].width / 2);

        tabListRef.current.scrollTo({
            x: Math.max(0, centerOffset),
            animated: true,
        });
    }
}, [activeTab, tabLayouts]);

    return (
    <Screen safe={false}>
      <View style={{ 
          backgroundColor: currentTheme.colors.background,
      }}>
        <View style={{ paddingTop: insets.top + 30 }}>
            <PremiumHeader
                title={isSearching ? "" : "FresherFlow"}
                style={{ paddingBottom: SPACING.md }}
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
                >
                    {feeds.map((feed, index) => {
                        const isActive = activeTab === index;
                        const tabKey = `tab-${feed.id || 'all'}-${index}`;
                        
                        const tabColor = isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted;

                        return (
                            <TouchableOpacity
                                key={tabKey}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onLayout={(e) => {
                                    const { x, width } = e.nativeEvent.layout;
                                    setTabLayouts(prev => ({ ...prev, [index]: { x, width, center: x + width / 2 - 0.5 } }));
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
                                width: 1,
                                transform: [
                                    { translateX: indicatorLeft },
                                    { scaleX: indicatorWidth }
                                ],
                                backgroundColor: currentTheme.colors.primary,
                            }
                        ]}
                    />
                </ScrollView>
            </View>
        </View>
      </View>
 
      <PagerView
        ref={pagerRef as any}
        style={{ flex: 1 }}
        initialPage={0}
        offscreenPageLimit={1}
        overdrag={false}
        overScrollMode="never"
        layoutDirection="ltr"
        onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
      >
            {feeds.map((item, index) => (
                <View key={`pager-${item.id || 'all'}-${index}`} style={{ flex: 1 }}>
                    <FeedTabContent
                        feedType={item.id}
                        navigation={navigation}
                        currentTheme={currentTheme}
                        isSaved={isSaved}
                        toggleSave={handleToggleSave}
                        handleScroll={handleScroll}
                        searchQuery={searchQuery}
                        savedJobs={savedJobs}
                    />
                </View>
            ))}
      </PagerView>
    </Screen>
  );
});

const styles = StyleSheet.create({
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
    },
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
