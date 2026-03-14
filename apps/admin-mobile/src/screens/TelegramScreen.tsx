import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Send } from 'lucide-react-native';
import { theme } from '../theme';
import { useTelegramScreen } from '../hooks/useTelegramScreen';

// Components
import { BroadcastStats } from '../components/telegram/BroadcastStats';
import { BroadcastFilters } from '../components/telegram/BroadcastFilters';
import { BroadcastCard } from '../components/telegram/BroadcastCard';

export const TelegramScreen = () => {
    const {
        broadcasts,
        statusFilter,
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
        retryBroadcast
    } = useTelegramScreen();

    useFocusEffect(useCallback(() => { void fetchBroadcasts({ force: true }); }, [fetchBroadcasts]));

    return (
        <View style={styles.container}>
            <BroadcastStats 
                sent={stats.sent}
                failed={stats.failed}
                pending={stats.pending}
                total={total}
            />

            <BroadcastFilters 
                currentFilter={statusFilter}
                onFilterChange={onFilter}
            />

            {loading ? <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} /> : (
                <FlatList
                    data={broadcasts}
                    keyExtractor={b => b.id}
                    renderItem={({ item }) => (
                        <BroadcastCard 
                            item={item} 
                            isRetrying={retryingId === item.id} 
                            onRetry={retryBroadcast} 
                        />
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ padding: 16 }} /> : null}
                    ListEmptyComponent={<View style={styles.empty}><Send size={36} color={theme.colors.border} /><Text style={styles.emptyText}>No broadcasts</Text></View>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: 12, gap: 10, paddingBottom: 40 },
    empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: theme.colors.textMuted },
});
