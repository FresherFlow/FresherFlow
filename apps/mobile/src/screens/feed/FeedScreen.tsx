import React, { useCallback, memo, useState, useMemo, useRef, useEffect } from 'react';
import { MotiView } from 'moti';
import { FlashList } from '@shopify/flash-list';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  BackHandler,
  ToastAndroid,
  ViewToken,
  TextInput,
  Animated,
  InteractionManager,
  Keyboard,
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { haptic } from '@/utils/haptics';
import { useSaved } from '@repo/frontend-core';

import { useFeed } from '@/hooks/useFeed';
import { saveDetailCache } from '@/utils/cache/offlineCache';

import { Analytics, EventNames } from '@/utils/analytics';
import { clearUnseenCount } from '@/utils/cache/localNotifications';
import { Opportunity } from '@fresherflow/types';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';
import { useFeedStore } from '@/store/useFeedStore';
import { useScrollTracker } from '@/hooks/useScrollTracker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl, ScrollToTopButton } from '@/system/components/PremiumPrimitives';
import { JobCard } from '@/system/components/OpportunityCard';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';
import { SectorSwitchCard } from '@/system/components/SectorSwitchCard';
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
  const openedIds = useFeedStore(s => s.openedIds);

  const { showScrollTop, handleScroll: localHandleScroll, scrollOffset } = useScrollTracker({
    threshold: 1200,
    scrollUpRequired: 200,
    onScrollPropagation: handleScroll
  });

  const smoothScrollToTop = useCallback(() => {
    if (!listRef.current) return;
    if (scrollOffset.current > 2000) {
      listRef.current.scrollToOffset({ offset: 0, animated: false });
    } else {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const scrollToTopRef = useRef({ scrollToTop: smoothScrollToTop });
  useScrollToTop(scrollToTopRef);

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
    error,
    isSyncing,
    isCacheEmpty,
  } = useFeed(tabFeedType);

  // Haptic confirmation when pull-to-refresh completes
  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !refreshing) {
      haptic.light();
    }
    prevRefreshing.current = refreshing;
  }, [refreshing]);

  const handleRefresh = useCallback(() => {
      // Prevent accidental Android ghost-refreshes when layout shifts while scrolled down
      if (scrollOffset.current > 10) return;
      onRefresh();
  }, [onRefresh]);

  // Sync search query from prop
  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);



  useFocusEffect(
    useCallback(() => {
      // Task 11: Clear unseen count when feed is active
      void clearUnseenCount();
      const task = InteractionManager.runAfterInteractions(() => {
        void useFeedStore.getState().refreshBehavioralData();
      });
      return () => task.cancel();
    }, [])
  );

  const listData = useMemo(() => {
    const data: FeedItem[] = [];
    
    // Show skeletons only when bootstrapping OR when the cache is genuinely empty + syncing.
    // Using isCacheEmpty instead of filteredOpportunities.length prevents showing skeletons
    // when there IS cached data but the current tab filter returns 0 results.
    if ((loading || (isCacheEmpty && isSyncing)) && !refreshing) {
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
  }, [loading, filteredOpportunities, refreshing, isSyncing]);

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
                    void useFeedStore.getState().markAsOpened(item.data.id);
                    navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                }}
                onSave={() => toggleSave(item.data)}
                isSaved={isSaved(item.data.id)}
                isViewed={openedIds.has(item.data.id)}
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
      case 'empty': {
        const isForYouTab = tabFeedType === null;
        
        let title = searchQuery ? "No results found" : "Community is quiet right now";
        let sub = searchQuery ? `We couldn't find anything for "${searchQuery}".` : "No live opportunities have been shared today yet.";
        let showProfileCta = false;
        let ctaText = "";
        let onCtaPress = () => {};

        if (!searchQuery && isForYouTab) {
            if (!hasProfileData) {
                title = "Personalize Your Feed";
                sub = "Complete your Career Profile to unlock matches tailored specifically to your degree, skills, and passout year.";
                showProfileCta = true;
                ctaText = "Set Up Career Profile";
                onCtaPress = () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('CareerProfile');
                };
            } else {
                title = "No Matches Found Yet";
                sub = "We couldn't find any jobs matching your profile details right now. Try adding more skills or adjusting your preferences.";
                showProfileCta = true;
                ctaText = "Manage Career Profile";
                onCtaPress = () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('CareerProfile');
                };
            }
        }

        return (
            <View style={styles.emptyContainer}>
                <Compass size={mScale(48)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>
                    {title}
                </Text>
                <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                    {sub}
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

                {!searchQuery && showProfileCta && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.ctaBtn, { backgroundColor: currentTheme.colors.primary, marginTop: 20 }]}
                        onPress={onCtaPress}
                    >
                        <Text style={[styles.ctaText, { color: currentTheme.colors.background }]}>{ctaText}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
      }
      default:
        return null;
    }
  }, [currentTheme, navigation, isSaved, toggleSave, isBootstrapping, searchQuery, tabFeedType, hasProfileData, openedIds]);

  
  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        {/* Error banner removed per user request */}
        <FlashList<FeedItem>
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            extraData={{ searchQuery, savedJobs, openedIds }}
            keyExtractor={(item) => item.key}
            // @ts-expect-error - FlashList typing bug with estimatedItemSize
            estimatedItemSize={180}
            getItemType={(item) => item.type}
            drawDistance={800}
            removeClippedSubviews={true}
            windowSize={3}
            maxToRenderPerBatch={5}
            initialNumToRender={5}
            showsVerticalScrollIndicator={false}

            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + mScale(60) }]}
            onEndReached={loadMore}
            onScroll={localHandleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
                <PremiumRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
                <View>
                    <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.sm }}>
                        <SectorSwitchCard navigation={navigation} />
                    </View>
                    <UsernameNudgeCard />
                </View>
            }
            ListFooterComponent={
                loadingMore ? <ActivityIndicator style={{ margin: SPACING.md }} color={currentTheme.colors.primary} /> : null
            }
        />

        <ScrollToTopButton visible={showScrollTop} onPress={smoothScrollToTop} />
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
  const unseenFeedCount = useNotificationStore(s => s.unseenFeedCount);
  const { hiddenFeedTabs, customFeedTabs } = useAppPreferencesStore();
  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const pagerRef = useRef<PagerView>(null);
  const tabListRef = useRef<ScrollView>(null);
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const [indicatorReady, setIndicatorReady] = useState(false);

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

  useEffect(() => {
      const sub = Keyboard.addListener('keyboardDidHide', () => {
          searchInputRef.current?.blur();
      });
      return () => sub.remove();
  }, []);

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
        
        // Ensure tab bar is visible when returning from an inner screen
        isTabBarVisible.current = true;
        showTabBar();

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

  const feeds = useMemo(() => {
    const allFeeds = [
      { id: 'latest', label: 'Latest' },
      { id: null, label: 'For You' },
      { id: 'trending', label: 'Trending' },
      { id: 'closing_soon', label: 'Closing Soon' },
      { id: 'remote', label: 'Remote' },
      { id: '2026', label: '2026 Batch' },
      { id: 'internships', label: 'Internships' },
      { id: 'walkins', label: 'Walk-ins' },
      ...customFeedTabs,
    ];
    return allFeeds.filter(f => !hiddenFeedTabs.includes((f.id || 'for_you') as any));
  }, [hiddenFeedTabs, customFeedTabs]);


  // Animate indicator position when tab changes. On first layout, snap instantly and reveal.
  const isFirstLayout = useRef(true);
  useEffect(() => {
    if (!tabLayouts[activeTab]) return;
    const targetX = tabLayouts[activeTab].center || tabLayouts[activeTab].x;
    const targetW = tabLayouts[activeTab].width;

    if (isFirstLayout.current) {
      // Snap to exact position with zero animation, then reveal
      indicatorLeft.setValue(targetX);
      indicatorWidth.setValue(targetW);
      isFirstLayout.current = false;
      setIndicatorReady(true);
    } else {
      Animated.parallel([
        Animated.spring(indicatorLeft, {
          toValue: targetX,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
        Animated.spring(indicatorWidth, {
          toValue: targetW,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
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

    pagerRef.current?.setPageWithoutAnimation(index);

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
                        const showBadge = feed.id === 'latest' && unseenFeedCount > 0;

                        return (
                            <TouchableOpacity
                                key={tabKey}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onLayout={(e) => {
                                    const { x, width } = e.nativeEvent.layout;
                                    setTabLayouts(prev => ({ ...prev, [index]: { x, width, center: x + width / 2 - 0.5 } }));
                                }}
                                style={[styles.feedTab, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
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
                                {showBadge && (
                                    <View style={{
                                        backgroundColor: currentTheme.colors.text,
                                        paddingHorizontal: 5,
                                        paddingVertical: 2,
                                        borderRadius: 10,
                                        minWidth: 18,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Text style={{
                                            color: currentTheme.colors.background,
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                        }}>
                                            {unseenFeedCount > 99 ? '99+' : unseenFeedCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            {
                                width: 1,
                                opacity: indicatorReady ? 1 : 0,
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
        offscreenPageLimit={2}
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
    syncErrorRow: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    syncErrorText: {
        flex: 1,
        fontSize: mScale(12),
        fontWeight: '700',
    },
    syncRetryButton: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    syncRetryText: {
        fontSize: mScale(12),
        fontWeight: '900',
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
