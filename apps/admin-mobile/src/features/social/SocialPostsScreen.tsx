import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { Share2 } from 'lucide-react-native';
import { SocialPostCard } from './components/SocialPostCard';
import { SocialPostFilters } from './components/SocialPostFilters';
import { useSocial } from './hooks/useSocial';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    Screen,
    Section,
} from '../system/layout/Layout';
import { 
    MetricCard
} from '../system/components/SpecializedCards';
import { 
    MetricGrid 
} from '../analytics/components/Metrics';
import { 
    EmptyState 
} from '../feedback/components/Feedback';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { mScale, SPACING } from '../../theme/dimensions';

export const SocialPostsScreen = () => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    const {
        posts,
        statusFilter,
        total,
        loading,
        refreshing,
        retryingId,
        stats,
        fetchPosts,
        onRefresh,
        onLoadMore,
        onFilter,
        retryPost,
    } = useSocial();

    useFocusEffect(useCallback(() => {
        void fetchPosts();
    }, [fetchPosts]));

    return (
        <Screen safe={true}>
            <SimpleHeader title="Social Ops" />
            
            <FlashList
                data={posts}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={mScale(120)}
                renderItem={({ item }) => (
                    <SocialPostCard
                        item={item}
                        isRetrying={retryingId === item.id}
                        onRetry={retryPost}
                    />
                )}
                ListHeaderComponent={
                    <View style={{ gap: SPACING.lg, marginTop: SPACING.sm }}>
                        <Section title="Queue Status">
                            <MetricGrid>
                                <MetricCard label="Published" value={stats.published} accent={colors.success} />
                                <MetricCard label="Failed" value={stats.failed} accent={colors.error} />
                                <MetricCard label="Pending" value={stats.pending} accent={colors.warning} />
                                <MetricCard label="Total" value={total} accent={colors.primary} />
                            </MetricGrid>
                        </Section>
                        <Section title="Status Filter">
                            <SocialPostFilters currentFilter={statusFilter} onFilterChange={onFilter} />
                        </Section>
                    </View>
                }
                contentContainerStyle={{ 
                    paddingHorizontal: SPACING.lg, 
                    paddingBottom: 100,
                    paddingTop: SPACING.md,
                }}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={colors.primary} 
                    />
                }
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
                    ) : (
                        <EmptyState 
                            title="No social posts" 
                            message="Change filter or wait for queue." 
                            icon={<Share2 size={36} color={colors.border} />} 
                        />
                    )
                }
            />
        </Screen>
    );
};
