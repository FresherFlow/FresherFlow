import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Compass } from 'lucide-react-native';
import { Opportunity } from '@fresherflow/types';

import { haptic } from '@/utils/haptics';
import { useFeed } from '@/hooks/useFeed';
import { useFeedStore } from '@/store/useFeedStore';
import { useScrollTracker } from '@/hooks/useScrollTracker';
import { clearUnseenCount } from '@/utils/cache/localNotifications';
import { AppTheme } from '@/contexts/ThemeContext';

import { PremiumRefreshControl, ScrollToTopButton } from '@/system/components/PremiumPrimitives';
import { JobCard } from '@/system/components/OpportunityCard';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';
import { SectorSwitchCard } from '@/system/components/SectorSwitchCard';
import { mScale, SPACING, RADIUS, SCREEN_WIDTH } from '@/system/constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type FeedItem =
  | { type: 'stats'; count: number; key: string }
  | { type: 'opportunity'; data: Opportunity; index: number; key: string }
  | { type: 'skeleton'; key: string }
  | { type: 'empty'; key: string };

interface FeedTabContentProps {
    feedType: string | null;
    navigation: any;
    currentTheme: AppTheme;
    isSaved: (id: string) => boolean;
    toggleSave: (opportunity: Opportunity) => void;
    handleScroll?: any;
    searchQuery: string;
    savedJobs: Opportunity[];
}

export const FeedTabContent = memo(({ 
    feedType: tabFeedType, navigation, currentTheme, isSaved, 
    toggleSave, handleScroll, searchQuery, savedJobs 
}: FeedTabContentProps) => {
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

  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !refreshing) {
      haptic.light();
    }
    prevRefreshing.current = refreshing;
  }, [refreshing]);

  const handleRefresh = useCallback(() => {
      if (scrollOffset.current > 10) return;
      onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    setSearchQuery(searchQuery);
  }, [searchQuery, setSearchQuery]);

  useFocusEffect(
    useCallback(() => {
      void clearUnseenCount();
      const task = InteractionManager.runAfterInteractions(() => {
        void useFeedStore.getState().refreshBehavioralData();
      });
      return () => task.cancel();
    }, [])
  );

  const listData = useMemo(() => {
    const data: FeedItem[] = [];
    
    if ((loading || (isCacheEmpty && isSyncing)) && !refreshing) {
      [1, 2, 3].forEach(i => data.push({ type: 'skeleton', key: `skeleton-${i}` }));
      return data;
    }

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
  }, [loading, filteredOpportunities, refreshing, isSyncing, isCacheEmpty]);

  const handleJobPress = useCallback((opportunity: Opportunity) => {
      void useFeedStore.getState().markAsOpened(opportunity.id);
      navigation.navigate('JobDetail', { opportunity, opportunityId: opportunity.id });
  }, [navigation]);

  const handleJobSave = useCallback((opportunity: Opportunity) => {
      toggleSave(opportunity);
  }, [toggleSave]);

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

const styles = StyleSheet.create({
    scrollContent: {
        paddingTop: SPACING.sm,
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
