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
  Keyboard,
  InteractionManager,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import {
  Shield,
  Search,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { haptic } from '@/utils/haptics';
import { useSaved } from '@repo/frontend-core';

import { useGovtFeed, GOVT_FEED_TABS } from '@/hooks/useGovtFeed';
import { useFeedStore } from '@/store/useFeedStore';
import { useScrollTracker } from '@/hooks/useScrollTracker';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';
import Fuse from 'fuse.js';

import { Opportunity } from '@fresherflow/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl, ScrollToTopButton } from '@/system/components/PremiumPrimitives';
import { GovtJobCard } from '@/system/components/GovtJobCard';
import { SectorSwitchCard } from '@/system/components/SectorSwitchCard';
import { mScale, SPACING, RADIUS, SCREEN_WIDTH } from '@/system/constants/dimensions';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUI } from '@/contexts/UIContext';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedList'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type GovtFeedItem =
  | { type: 'opportunity'; data: Opportunity; index: number; key: string }
  | { type: 'skeleton'; key: string }
  | { type: 'empty'; key: string };

interface FeedTabContentProps {
    tabId: string | null;
    navigation: NativeStackScreenProps<RootStackParamList, 'FeedList'>['navigation'];
    isSaved: (id: string) => boolean;
    toggleSave: (opportunity: Opportunity) => void;
    handleScroll?: any;
    searchQuery: string;
}

const GovtFeedTabContent = memo(({ tabId, navigation, isSaved, toggleSave, handleScroll, searchQuery }: FeedTabContentProps) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef<any>(null);
  const { currentTheme } = useTheme();

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

  const govtOpportunities = useGovtFeed(tabId);
  const { isBootstrapping, isRefreshing, performSync, refreshBehavioralData, isSyncing, openedIds } = useFeedStore();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fuseIndex = useMemo(() => {
    if (govtOpportunities.length === 0 || debouncedSearchQuery.trim().length < 2) return null;
    return new Fuse(govtOpportunities, {
      keys: [
        'title',
        'company',
        'governmentJobDetails.examName',
        'governmentJobDetails.recruitingBody',
        'governmentJobDetails.posts.name',
        'jobFunction',
        'locations'
      ],
      threshold: 0.3,
    });
  }, [govtOpportunities, debouncedSearchQuery]);

  const filteredOpportunities = useMemo(() => {
    if (!searchQuery.trim()) return govtOpportunities;
    if (fuseIndex && debouncedSearchQuery.trim().length >= 2) {
      return fuseIndex.search(debouncedSearchQuery).map(r => r.item);
    }
    return govtOpportunities;
  }, [govtOpportunities, searchQuery, debouncedSearchQuery, fuseIndex]);

  const handleRefresh = useCallback(() => {
      if (scrollOffset.current > 10) return;
      void refreshBehavioralData();
      void performSync(true, true);
  }, [performSync, refreshBehavioralData]);



  const listData = useMemo(() => {
    const data: GovtFeedItem[] = [];
    
    if ((isBootstrapping || (filteredOpportunities.length === 0 && isSyncing)) && !isRefreshing) {
      [1, 2, 3].forEach(i => data.push({ type: 'skeleton', key: `skeleton-${i}` }));
      return data;
    }

    if (filteredOpportunities.length === 0) {
      data.push({ type: 'empty', key: 'empty' });
    } else {
      const seenIds = new Set<string>();
      filteredOpportunities.forEach((item, index) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          data.push({ type: 'opportunity', data: item, index, key: `govt-job-${item.id}` });
        }
      });
    }

    return data;
  }, [isBootstrapping, filteredOpportunities, isRefreshing, isSyncing]);
  const handleJobPress = useCallback((opportunity: Opportunity) => {
      void useFeedStore.getState().markAsOpened(opportunity.id);
      navigation.navigate('GovtJobDetail', { opportunity, opportunityId: opportunity.id });
  }, [navigation]);

  const handleJobSave = useCallback((opportunity: Opportunity) => {
      toggleSave(opportunity);
  }, [toggleSave]);

  const renderItem = useCallback(({ item }: { item: GovtFeedItem }) => {
    switch (item.type) {
      case 'opportunity':
        return (
            <GovtJobCard
                opportunity={item.data}
                index={item.index}
                onPress={handleJobPress}
                onSave={handleJobSave}
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
        const title = searchQuery ? "No results found" : "No government exams right now";
        const sub = searchQuery ? `We couldn't find anything matching "${searchQuery}".` : "Check back later for newly announced notifications.";

        return (
            <View style={styles.emptyContainer}>
                <Shield size={mScale(48)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>
                    {title}
                </Text>
                <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted, textAlign: 'center' }]}>
                    {sub}
                </Text>
            </View>
        );
      }
      default:
        return null;
    }
  }, [currentTheme, navigation, isSaved, toggleSave, isBootstrapping, searchQuery, openedIds]);

  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        <FlashList<GovtFeedItem>
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            extraData={{ searchQuery, govtOpportunities, openedIds }}
            keyExtractor={(item) => item.key}
            // @ts-expect-error - FlashList typing bug with estimatedItemSize
            estimatedItemSize={180}
            getItemType={(item) => item.type}
            drawDistance={800}
            showsVerticalScrollIndicator={false}

            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + mScale(60) }]}
            onScroll={localHandleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
                <PremiumRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
                <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.sm }}>
                    <SectorSwitchCard navigation={navigation} />
                </View>
            }
        />

        <ScrollToTopButton visible={showScrollTop} onPress={smoothScrollToTop} />
    </View>
  );
});

const GovtFeedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { showSuccess } = useToast();
  const { isSaved, toggleSave } = useSaved();
  const { hideTabBar, showTabBar } = useUI();
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

  const { hiddenFeedTabs } = useAppPreferencesStore();
  const visibleTabs = useMemo(() => {
    return GOVT_FEED_TABS.filter((feed) => {
        if (feed.id === null) return true; // 'All' tab cannot be hidden
        return !hiddenFeedTabs.includes(feed.id as any);
    });
  }, [hiddenFeedTabs]);

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
        isTabBarVisible.current = true;
        showTabBar();
        const task = InteractionManager.runAfterInteractions(() => {
            void useFeedStore.getState().refreshBehavioralData();
        });

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
                return true;
            }
            BackHandler.exitApp();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => {
            task.cancel();
            subscription.remove();
        };
    }, [])
  );

  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number, center: number}}>({});

  // Animate indicator position when tab changes. On first layout, snap instantly and reveal.
  const isFirstLayout = useRef(true);
  useEffect(() => {
    if (!tabLayouts[activeTab]) return;
    const targetX = tabLayouts[activeTab].center || tabLayouts[activeTab].x;
    const targetW = tabLayouts[activeTab].width;

    if (isFirstLayout.current) {
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

  useEffect(() => {
    showTabBar();
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
    if (index >= 0 && index < visibleTabs.length && index !== activeTabRef.current) {
        activeTabRef.current = index;

        requestAnimationFrame(() => {
            setActiveTab(index);
        });
        
        if (tabLayouts[index] && tabListRef.current) {
            const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
            tabListRef.current.scrollTo({ x: Math.max(0, centerOffset), animated: true });
        }
    }
  }, [tabLayouts]);

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
  }, [tabLayouts]);

  return (
    <Screen safe={false}>
      <View style={{ 
          backgroundColor: currentTheme.colors.background,
      }}>
        <View style={{ paddingTop: insets.top + 30 }}>
            <PremiumHeader
                title={isSearching ? "" : "Government Jobs"}
                style={{ paddingBottom: SPACING.md }}
                leftSlot={isSearching ? (
                    <View style={[styles.searchContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                        <Search size={18} color={currentTheme.colors.textMuted} />
                        <TextInput
                            ref={searchInputRef}
                            style={[styles.searchInput, { color: currentTheme.colors.text }]}
                            placeholder="Search exams, recruiting bodies..."
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
                    {visibleTabs.map((feed, index) => {
                        const isActive = activeTab === index;
                        const tabKey = `govt-tab-${feed.id || 'all'}-${index}`;
                        
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
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
        overdrag={true}
      >
        {visibleTabs.map((feed) => (
            <View key={`govt-page-${feed.id || 'all'}`} style={{ flex: 1 }}>
                <GovtFeedTabContent
                    tabId={feed.id}
                    navigation={navigation}
                    isSaved={isSaved}
                    toggleSave={handleToggleSave}
                    handleScroll={handleScroll}
                    searchQuery={searchQuery}
                />
            </View>
        ))}
      </PagerView>
    </Screen>
  );
});

export default GovtFeedScreen;

const styles = StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionBtn: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: mScale(14),
    fontWeight: '800',
  },
  feedSelector: {
    height: 40,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
    marginBottom: 8,
  },
  feedList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xl,
    alignItems: 'center',
    height: '100%',
  },
  feedTab: {
    height: '100%',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  feedTabText: {
    fontSize: mScale(14),
    fontWeight: '900',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
  },
  scrollContent: {
    paddingTop: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    fontSize: mScale(11),
    fontWeight: '600',
  },
  skeletonCard: {
    height: 180,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  skeletonCircle: {
    width: mScale(40),
    height: mScale(40),
    borderRadius: mScale(20),
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: mScale(18),
    fontWeight: '900',
    marginTop: SPACING.sm,
  },
  emptySub: {
    fontSize: mScale(13),
    fontWeight: '600',
  },

});
