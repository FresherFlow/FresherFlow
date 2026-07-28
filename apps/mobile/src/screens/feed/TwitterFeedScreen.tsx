import React, { memo, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { useFeed } from '@/hooks/useFeed';
import { useSaved } from '@repo/frontend-core';
import { JobPost } from './components/JobPost';
import { FeedFilterBar, FilterCategory } from './components/FeedFilterBar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { ScreenErrorBoundary } from '@/system/components/ScreenErrorBoundary';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

const SkeletonPost = memo(() => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonLinesContainer}>
        <View style={styles.skeletonTitleLine} />
        <View style={styles.skeletonSubLine} />
      </View>
    </View>
    <View style={styles.skeletonBodyLine} />
    <View style={styles.skeletonShortLine} />
  </View>
));

export const TwitterFeedScreenContent: React.FC<Props> = memo(({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const { isSaved, toggleSave } = useSaved();
  const {
    opportunities,
    loading,
    refreshing,
    onRefresh,
    loadMore,
  } = useFeed(null);

  const filteredOpportunities = useMemo(() => {
    if (activeFilter === 'All') return opportunities;

    return opportunities.filter(opp => {
      if (activeFilter === 'Remote') return opp.workMode === 'REMOTE';
      if (activeFilter === 'Walk-in') return opp.type === OpportunityType.WALKIN;
      if (activeFilter === 'Internship') return opp.type === OpportunityType.INTERNSHIP;
      if (activeFilter === 'Software') {
        const text = `${opp.title} ${opp.description} ${opp.requiredSkills?.join(' ')}`.toLowerCase();
        return text.includes('software') || text.includes('developer') || text.includes('engineer') || text.includes('code');
      }
      if (activeFilter === 'Marketing') {
        const text = `${opp.title} ${opp.description}`.toLowerCase();
        return text.includes('marketing') || text.includes('seo') || text.includes('content') || text.includes('growth');
      }
      if (activeFilter === 'Finance') {
        const text = `${opp.title} ${opp.description}`.toLowerCase();
        return text.includes('finance') || text.includes('analyst') || text.includes('accountant') || text.includes('audit');
      }
      return true;
    });
  }, [opportunities, activeFilter]);

  const handleJobPress = useCallback((opportunity: Opportunity) => {
    navigation.navigate('JobDetail', { opportunity, opportunityId: opportunity.id });
  }, [navigation]);

  const handleApply = useCallback((opportunity: Opportunity) => {
    navigation.navigate('JobDetail', { opportunity, opportunityId: opportunity.id });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Opportunity }) => (
    <JobPost
      opportunity={item}
      onPress={handleJobPress}
      onApply={handleApply}
      onSave={toggleSave}
      isSaved={isSaved(item.id)}
    />
  ), [handleJobPress, handleApply, toggleSave, isSaved]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Top Twitter Style Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FresherFlow</Text>
      </View>

      {/* Filter Bar */}
      <FeedFilterBar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* Feed List */}
      {loading && opportunities.length === 0 ? (
        <View style={styles.skeletonList}>
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </View>
      ) : (
        <FlashList<Opportunity>
          data={filteredOpportunities}
          renderItem={renderItem}
          // @ts-expect-error - FlashList typing mismatch with estimatedItemSize
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
});

export const TwitterFeedScreen: React.FC<Props> = (props) => (
  <ScreenErrorBoundary screenName="Twitter Feed">
    <TwitterFeedScreenContent {...props} />
  </ScreenErrorBoundary>
);

export default TwitterFeedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3336',
    backgroundColor: '#000000',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  skeletonList: {
    paddingTop: 8,
  },
  skeletonContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2f3336',
    gap: 12,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f3336',
  },
  skeletonLinesContainer: {
    flex: 1,
    gap: 6,
  },
  skeletonTitleLine: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#2f3336',
  },
  skeletonSubLine: {
    width: '35%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#16181c',
  },
  skeletonBodyLine: {
    width: '90%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#2f3336',
  },
  skeletonShortLine: {
    width: '75%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#16181c',
  },
});
