import React, { useCallback, memo, useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    TrendingUp,
  Compass,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSaved } from '@repo/frontend-core';

import { useFeed } from '@/hooks/useFeed';
import { saveDetailCache } from '@/utils/offlineCache';
import { Opportunity } from '@fresherflow/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { OpportunityCard } from '@/system/components/OpportunityCard';
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
  } = useFeed(tabFeedType);
  
  const listData = useMemo(() => {
    const data: FeedItem[] = [];
    data.push({ type: 'stats', count: totalResults, key: 'stats' });

    if (loading && !refreshing) {
      [1, 2, 3].forEach(i => data.push({ type: 'skeleton', key: `skeleton-${i}` }));
    } else if (filteredOpportunities.length === 0) {
      data.push({ type: 'empty', key: 'empty' });
    } else {
      filteredOpportunities.forEach((item, index) => {
        data.push({ type: 'opportunity', data: item, index, key: `job-${item.id}-${index}` });
      });
    }

    return data;
  }, [loading, filteredOpportunities, totalResults, refreshing]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    switch (item.type) {
      case 'stats':
        if (item.count === 0) return null;
        return (
            <View style={styles.statsRow}>
                <View style={styles.statsLabel}>
                    <TrendingUp size={mScale(12)} color={currentTheme.colors.primary} />
                    <Text style={[styles.statsText, { color: currentTheme.colors.textMuted }]}>
                        <Text style={{ fontWeight: '800', color: currentTheme.colors.text }}>SHOWING</Text> {item.count} OPPORTUNITIES
                    </Text>
                </View>
            </View>
        );
      case 'opportunity':
        return (
            <View style={{ paddingHorizontal: SPACING.lg }}>
                <OpportunityCard
                    opportunity={item.data}
                    onPress={() => {
                        void saveDetailCache(item.data);
                        navigation.navigate('JobDetail', { opportunity: item.data, opportunityId: item.data.id });
                    }}
                    onSave={() => toggleSave(item.data)}
                    isSaved={isSaved(item.data.id)}
                />
            </View>
        );
      case 'skeleton':
        return <View style={[styles.skeleton, { backgroundColor: alpha(currentTheme.colors.text, 0.03) }]} />;
      case 'empty':
        return (
            <View style={styles.emptyContainer}>
                <Compass size={mScale(48)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>Community is quiet right now</Text>
                <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>Try adjusting your filters or search keywords.</Text>
                <View style={{ marginTop: SPACING.lg, width: '100%', alignItems: 'center' }}>
                    <Text style={{ fontSize: mScale(12), fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: SPACING.sm, letterSpacing: 0.5 }}>TRENDING TAGS</Text>
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
        <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + mScale(80) }]}
            onEndReached={loadMore}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
            }
            ListFooterComponent={
                loadingMore ? <ActivityIndicator style={{ margin: SPACING.md }} color={currentTheme.colors.primary} /> : null
            }
        />
    </View>
  );
});

const FeedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const { currentTheme } = useTheme();
  const { isSaved, toggleSave } = useSaved();
  const { hideTabBar, showTabBar } = useUI();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  const tabListRef = useRef<ScrollView>(null);
  
  // Tab indicator animations
  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number}}>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const feeds = [
    { id: null, label: 'For You' },
    { id: 'trending', label: 'Trending' },
    { id: 'remote', label: 'Remote' },
    { id: '2026', label: '2026 Batch' },
    { id: 'internships', label: 'Internships' },
  ];

  // Update indicator position when active tab or layouts change
  useEffect(() => {
    if (tabLayouts[activeTab]) {
      const { x, width } = tabLayouts[activeTab];
      Animated.spring(indicatorX, {
        toValue: x,
        useNativeDriver: false,
        tension: 140,
        friction: 12,
      }).start();
      Animated.spring(indicatorWidth, {
        toValue: width,
        useNativeDriver: false,
        tension: 140,
        friction: 12,
      }).start();
    }
  }, [activeTab, tabLayouts]);

  // Track scroll position for hide/show tab bar
  const scrollOffset = useRef(0);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
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
  }, [hideTabBar, showTabBar]);

    const onPagerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveTab(index);
    pagerRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
    if (tabLayouts[index]) {
        const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
        tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
    }
  };

  return (
    <Screen safe={false}>
      <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
        <PremiumHeader 
            title="Discover" 
            rightSlot={
                <TouchableOpacity 
                    style={styles.themeBtn}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                >
                    <View style={styles.moreIconRow}>
                        <View style={[styles.moreDot, { backgroundColor: currentTheme.colors.primary }]} />
                        <View style={[styles.moreDot, { backgroundColor: currentTheme.colors.primary }]} />
                        <View style={[styles.moreDot, { backgroundColor: currentTheme.colors.primary }]} />
                    </View>
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
                    return (
                        <TouchableOpacity 
                            key={feed.id || 'all'}
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
                <Animated.View 
                    style={[
                        styles.tabIndicator, 
                        { 
                            left: indicatorX, 
                            width: indicatorWidth,
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
        keyExtractor={(f) => f.id || 'all'}
        showsHorizontalScrollIndicator={false}
        onScroll={onPagerScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => (
            <FeedTabContent 
                feedType={item.id}
                navigation={navigation}
                currentTheme={currentTheme}
                isSaved={isSaved}
                toggleSave={toggleSave}
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
        fontSize: mScale(13),
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    themeBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreIconRow: {
        flexDirection: 'column',
        gap: 3,
        alignItems: 'center',
    },
    moreDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
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
        fontSize: mScale(10),
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    skeleton: {
        height: mScale(160),
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: RADIUS.lg,
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
