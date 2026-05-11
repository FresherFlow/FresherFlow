import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Share2 } from 'lucide-react-native';
import { SocialPostCard } from './components/SocialPostCard';
import { SocialPostFilters } from './components/SocialPostFilters';
import { useSocial } from './hooks/useSocial';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    Screen,
    Section,
    PageIntro 
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

export const SocialPostsScreen = () => {
    const { colors, spacing } = useTheme();
    const {
        posts,
        statusFilter,
        total,
        loading,
        loadingMore,
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
        void fetchPosts({ force: true });
    }, [fetchPosts]));

    return (
        <Screen>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <SocialPostCard
                        item={item}
                        isRetrying={retryingId === item.id}
                        onRetry={retryPost}
                    />
                )}
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                        <PageIntro eyebrow="Social" title="Queue" />
                        <Section title="Queue status">
                            <MetricGrid>
                                <MetricCard label="Published" value={stats.published} accent={colors.success} />
                                <MetricCard label="Failed" value={stats.failed} accent={colors.error} />
                                <MetricCard label="Pending" value={stats.pending} accent={colors.warning} />
                                <MetricCard label="Visible total" value={total} accent={colors.primary} />
                            </MetricGrid>
                        </Section>
                        <Section title="Status filter">
                            <SocialPostFilters currentFilter={statusFilter} onFilterChange={onFilter} />
                        </Section>
                    </View>
                }
                contentContainerStyle={{ padding: spacing.md, gap: 10, paddingBottom: spacing.xxl }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
                    ) : (
                        <EmptyState title="No social posts" message="Change the filter or wait for the publishing queue to populate." icon={<Share2 size={36} color={colors.border} />} />
                    )
                }
            />
        </Screen>
    );
};


