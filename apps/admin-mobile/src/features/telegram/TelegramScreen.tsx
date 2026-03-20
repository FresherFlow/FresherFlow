import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Send } from 'lucide-react-native';
import { BroadcastCard } from './components/BroadcastCard';
import { BroadcastFilters } from './components/BroadcastFilters';
import { TELEGRAM_WINDOW_OPTIONS, useTelegram } from './hooks/useTelegram';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    Screen,
    Section,
    PageIntro 
} from '../system/layout/Layout';
import { 
    MetricCard,
    SurfaceCard 
} from '../system/components/SpecializedCards';
import { 
    SegmentedControl 
} from '../system/components/Controls';
import { 
    MetricGrid 
} from '../analytics/components/Metrics';
import { 
    EmptyState 
} from '../feedback/components/Feedback';

export const TelegramScreen = () => {
    const { colors, spacing } = useTheme();
    const {
        broadcasts,
        statusFilter,
        selectedWindow,
        total,
        loading,
        loadingMore,
        refreshing,
        retryingId,
        stats,
        fetchBroadcasts,
        onRefresh,
        onLoadMore,
        onFilter,
        onWindowChange,
        retryBroadcast,
    } = useTelegram();

    useFocusEffect(useCallback(() => {
        void fetchBroadcasts({ force: true });
    }, [fetchBroadcasts]));

    return (
        <Screen>
            <FlatList
                data={broadcasts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BroadcastCard
                        item={item}
                        isRetrying={retryingId === item.id}
                        onRetry={retryBroadcast}
                    />
                )}
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                        <PageIntro eyebrow="Telegram" title="Broadcasts" />
                        <View style={styles.topBar}>
                            <View style={{ flex: 1 }}>
                                <SegmentedControl
                                    options={TELEGRAM_WINDOW_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                                    selectedValue={selectedWindow}
                                    onChange={onWindowChange}
                                />
                            </View>
                            <Text style={[styles.windowText, { color: colors.textMuted }]}>{total}</Text>
                        </View>

                        <Section title="Broadcast state">
                            <MetricGrid>
                                <MetricCard label="Sent" value={stats.sent} accent={colors.success} />
                                <MetricCard label="Failed" value={stats.failed} accent={colors.error} />
                                <MetricCard label="Skipped" value={stats.skipped} accent={colors.warning} />
                                <MetricCard label="Visible total" value={total} accent={colors.primary} />
                            </MetricGrid>
                        </Section>

                        <Section title="Status filter">
                            <BroadcastFilters currentFilter={statusFilter} onFilterChange={onFilter} />
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
                        <EmptyState title="No broadcasts" message="Try widening the date range or changing the status filter." icon={<Send size={36} color={colors.border} />} />
                    )
                }
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    windowText: {
        minWidth: 36,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '700',
    },
});


