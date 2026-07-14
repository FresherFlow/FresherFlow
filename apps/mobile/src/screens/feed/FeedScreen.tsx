import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSaved } from '@repo/frontend-core';

import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/store/useNotificationStore';
import { RootStackParamList } from '@/navigation/types';

import { Screen } from '@/system/layout/Layout';
import { Opportunity } from '@fresherflow/types';

import { useFeedScreenLogic } from './hooks/useFeedScreenLogic';
import { FeedHeader } from './components/FeedHeader';
import { FeedTabContent } from './components/FeedTabContent';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedList'>;

const FeedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { showSuccess } = useToast();
  
  // App-level state to pass down
  const { isSaved, toggleSave, savedJobs } = useSaved();
  const { unreadCount } = useNotifications();
  const unseenFeedCount = useNotificationStore(s => s.unseenFeedCount);

  // Extracted orchestration logic
  const {
    activeTab,
    pagerRef,
    tabListRef,
    indicatorLeft,
    indicatorWidth,
    indicatorReady,
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
  } = useFeedScreenLogic();

  // Save callback orchestrator
  const handleToggleSave = useCallback((opportunity: Opportunity) => {
    const wasSaved = isSaved(opportunity.id);
    toggleSave(opportunity);
    showSuccess(wasSaved ? 'Opportunity removed from saved' : 'Opportunity saved successfully!');
  }, [isSaved, toggleSave, showSuccess]);

  return (
    <Screen safe={false}>
      <FeedHeader 
        currentTheme={currentTheme}
        isSearching={isSearching}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        toggleSearch={toggleSearch}
        unreadCount={unreadCount}
        unseenFeedCount={unseenFeedCount}
        feeds={feeds}
        activeTab={activeTab}
        handleTabPress={handleTabPress}
        handleTabLayout={handleTabLayout}
        indicatorLeft={indicatorLeft}
        indicatorWidth={indicatorWidth}
        indicatorReady={indicatorReady}
        tabListRef={tabListRef}
        insets={insets}
        navigation={navigation}
      />
 
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

export default FeedScreen;
