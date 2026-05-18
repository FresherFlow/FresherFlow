import React, { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { Send } from 'lucide-react-native';
import { BroadcastCard } from './components/BroadcastCard';
import { BroadcastFilters } from './components/BroadcastFilters';
import { TELEGRAM_WINDOW_OPTIONS, useTelegram } from './hooks/useTelegram';
import { useTheme } from '../../theme/ThemeProvider';
import { 
    Screen,
    Section,
} from '../system/layout/Layout';
import { 
    MetricCard
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
import { SimpleHeader } from '../system/components/SimpleHeader';
import { mScale, SPACING } from '../../theme/dimensions';

export const TelegramScreen = () => {
    const { currentTheme } = useTheme();
    const {
        broadcasts,
        statusFilter,
        selectedWindow,
        total,
        loading,
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
        void fetchBroadcasts();
    }, [fetchBroadcasts]));

    return (
        <Screen safe={true}>
            <SimpleHeader title="Telegram Operations" />
            
            <FlashList
                data={broadcasts}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={mScale(100)}
                renderItem={({ item }) => (
                    <BroadcastCard
                        item={item}
                        isRetrying={retryingId === item.id}
                        onRetry={retryBroadcast}
                    />
                )}
                ListHeaderComponent={
                    <View style={{ gap: SPACING.lg }}>
                        <View style={styles.topBar}>
                            <View style={{ flex: 1 }}>
                                <SegmentedControl
                                    options={TELEGRAM_WINDOW_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
                                    selectedValue={selectedWindow}
                                    onChange={onWindowChange}
                                />
                            </View>
                            <Text style={[styles.windowText, { color: currentTheme.colors.textMuted }]}>{total}</Text>
                        </View>

                        <Section title="Broadcast State">
                            <MetricGrid>
                                <MetricCard label="Sent" value={stats.sent} accent={currentTheme.colors.success} />
                                <MetricCard label="Failed" value={stats.failed} accent={currentTheme.colors.error} />
                                <MetricCard label="Skipped" value={stats.skipped} accent={currentTheme.colors.warning} />
                                <MetricCard label="Total" value={total} accent={currentTheme.colors.primary} />
                            </MetricGrid>
                        </Section>

                        <Section title="Status Filter">
                            <BroadcastFilters currentFilter={statusFilter} onFilterChange={onFilter} />
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
                        tintColor={currentTheme.colors.primary} 
                    />
                }
                onEndReached={onLoadMore}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 60 }} />
                    ) : (
                        <EmptyState 
                            title="No broadcasts" 
                            message="Try widening the date range or changing filters." 
                            icon={<Send size={36} color={currentTheme.colors.border} />} 
                        />
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
        marginTop: SPACING.sm,
    },
    windowText: {
        minWidth: 36,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: '900',
    },
});
