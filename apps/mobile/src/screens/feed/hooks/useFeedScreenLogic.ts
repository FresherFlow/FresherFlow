import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Animated, Keyboard, TextInput, BackHandler, ToastAndroid, Platform, ScrollView } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { Analytics, EventNames } from '@/utils/analytics';
import { clearUnseenCount } from '@/utils/cache/localNotifications';
import { useUI } from '@/contexts/UIContext';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';
import { SCREEN_WIDTH } from '@/system/constants/dimensions';

export function useFeedScreenLogic() {
  const { hideTabBar, showTabBar } = useUI();
  const { hiddenFeedTabs, customFeedTabs } = useAppPreferencesStore();

  const [activeTab, setActiveTab] = useState(0);
  const activeTabRef = useRef(0);
  const pagerRef = useRef<PagerView>(null);
  const tabListRef = useRef<ScrollView>(null);
  
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const [indicatorReady, setIndicatorReady] = useState(false);
  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number, center: number}}>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const scrollOffset = useRef(0);
  const isTabBarVisible = useRef(true);

  // --- Search Side Effects ---
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

  // --- Focus Side Effects ---
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
    }, [showTabBar])
  );

  // --- Tabs Definition ---
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

  // --- Indicator Animation Effect ---
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
  }, [tabLayouts, activeTab, indicatorLeft, indicatorWidth]);

  // --- Tab Visibility on switch ---
  useEffect(() => {
    showTabBar();
    Analytics.trackEvent(EventNames.FILTER_CHANGED, { tab: feeds[activeTab].label });
  }, [activeTab, feeds, showTabBar]);

  // --- Scroll Tracking for Tab Bar ---
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

  // --- Tab Handling ---
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

  const handleTabLayout = useCallback((index: number, e: any) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts(prev => ({ ...prev, [index]: { x, width, center: x + width / 2 - 0.5 } }));
  }, []);

  return {
    activeTab,
    activeTabRef,
    pagerRef,
    tabListRef,
    indicatorLeft,
    indicatorWidth,
    indicatorReady,
    tabLayouts,
    handleTabLayout,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchInputRef,
    toggleSearch,
    feeds,
    handleScroll,
    handlePageSelected,
    handleTabPress,
  };
}
