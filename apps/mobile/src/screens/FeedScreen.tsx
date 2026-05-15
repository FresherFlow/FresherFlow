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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
    TrendingUp,
    Compass,
    Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSaved } from '@repo/frontend-core';

import { useFeed } from '@/hooks/useFeed';
import { saveDetailCache } from '@/utils/offlineCache';
import { markJobAsSeen } from '@/utils/seenJobs';
import { clearUnseenCount } from '@/utils/localNotifications';
import { Opportunity } from '@fresherflow/types';
import { useNotifications } from '@/hooks/useNotifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { JobCard } from '@/system/components/OpportunityCard';
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
    handleScroll: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

const FeedTabContent = memo(({ feedType: tabFeedType, navigation, currentTheme, isSaved, toggleSave, handleScroll }: FeedTabContentProps) => {
  const insets = useSafeAreaInsets();
  const {
    loading,
    refreshing,
    onRefresh,
    filteredOpportunities,
    loadMore,
    loadingMore,
    totalResults,
    setSearchQuery,
    isBootstrapping,
  } = useFeed(tabFeedType);

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
                <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>Community is quiet right now</Text>
                <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>Try adjusting your filters or search keywords.</Text>
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
            </View>
        );
      default:
        return null;
    }
  }, [currentTheme, navigation, isSaved, toggleSave]);

  
  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        <FlashList<FeedItem>
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            // @ts-expect-error - FlashList typing bug with estimatedItemSize
            estimatedItemSize={160}
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
  const isManualScrolling = useRef(false);

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


  // Update indicator position and ensure tab bar is visible when switching tabs
  useEffect(() => {
    showTabBar();
  }, [activeTab]);

  // Track scroll position for hide/show tab bar
  // Track scroll position and visibility state for performance
  const scrollOffset = useRef(0);
  const isTabBarVisible = useRef(true);

  const handleToggleSave = useCallback((opportunity: Opportunity) => {
    const wasSaved = isSaved(opportunity.id);
    toggleSave(opportunity);
    showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
  }, [isSaved, toggleSave, showSuccess]);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';
    
    // Minimal threshold to avoid jitter
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

    const onPagerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
        if (isManualScrolling.current) return;
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index !== activeTab && index >= 0 && index < feeds.length) {
            setActiveTab(index);
            if (tabLayouts[index]) {
                const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
                tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
            }
        }
    }, [activeTab, tabLayouts, feeds.length]);

    const onMomentumScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        isManualScrolling.current = false;
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (index !== activeTab) {
            setActiveTab(index);
            if (tabLayouts[index]) {
                const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
                tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
            }
        }
    };

  const handleTabPress = (index: number) => {
    if (index === activeTab) return;
    isManualScrolling.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update indicator immediately for better perceived performance
    if (tabLayouts[index]) {
        const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
        tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
    }

    pagerRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });

    // We update activeTab here, but ensure onPagerScroll doesn't conflict
    setActiveTab(index);
  };

  return (
    <Screen safe={false}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <PremiumHeader
            title="Discover"
            rightSlot={
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Notifications')}
                    style={styles.notificationBtn}
                >
                    <Bell size={24} color={currentTheme.colors.text} />
                    {unreadCount > 0 && (
                        <View style={{ backgroundColor: currentTheme.colors.primary, position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 }} />
                    )}
                </TouchableOpacity>
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
                                    opacity: isActive ? 1 : 0.6
                                }
                            ]}>
                                {feed.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <MotiView
                    animate={{
                        left: tabLayouts[activeTab]?.x || 0,
                        width: tabLayouts[activeTab]?.width || 0,
                    }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                    style={[
                        styles.tabIndicator,
                        {
                            backgroundColor: currentTheme.colors.primary,
                        }
                    ]}
                />
            </ScrollView>
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
        scrollEventThrottle={32}
        onMomentumScrollEnd={onMomentumScrollEnd}
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
        paddingTop: SPACING.md,
    },
    feedSelector: {
        marginBottom: 0,
    },
    feedList: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    feedTab: {
        paddingVertical: SPACING.md,
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
    }
});

export default FeedScreen;
