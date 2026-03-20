import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { TelegramBroadcast } from '@fresherflow/api-client';

interface BroadcastCardProps {
    item: TelegramBroadcast;
    isRetrying: boolean;
    onRetry: (id: string) => void;
}

export const BroadcastCard = ({ item, isRetrying, onRetry }: BroadcastCardProps) => {
    const { colors } = useTheme();

    const STATUS_META: Record<string, { color: string }> = {
        SENT: { color: colors.success },
        FAILED: { color: colors.error },
        PENDING: { color: colors.accent },
        RETRY: { color: colors.secondary },
    };

    const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
    
    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <View style={{ flex: 1 }}>
                    {item.opportunity && (
                        <Text style={[styles.oppTitle, { color: colors.primary }]} numberOfLines={1}>
                            {item.opportunity.title} · {item.opportunity.company}
                        </Text>
                    )}
                    <Text style={[styles.msgPreview, { color: colors.text }]} numberOfLines={3}>{item.message}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.statusChip, { backgroundColor: meta.color + '20' }]}>
                            <Text style={[styles.statusChipText, { color: meta.color }]}>{item.status}</Text>
                        </View>
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>
                            {item.sentAt
                                ? new Date(item.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : item.scheduledAt
                                    ? `Scheduled: ${new Date(item.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                                    : 'Not sent'}
                        </Text>
                    </View>
                    {(item.failureReason || (item as { errorMessage?: string }).errorMessage) && (
                        <Text style={[styles.failReason, { color: colors.error }]} numberOfLines={2}>
                            ⚠ {item.failureReason ?? (item as { errorMessage?: string }).errorMessage}
                        </Text>
                    )}
                </View>
                {item.status === 'FAILED' && (
                    <TouchableOpacity 
                        style={[styles.retryBtn, { backgroundColor: colors.secondary }, isRetrying && { opacity: 0.6 }]} 
                        onPress={() => onRetry(item.id)} 
                        disabled={isRetrying}
                    >
                        {isRetrying ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <RefreshCw size={14} color="#fff" />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: 12, borderWidth: 1, padding: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    oppTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    msgPreview: { fontSize: 13, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    statusChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    statusChipText: { fontSize: 10, fontWeight: '800' },
    metaText: { fontSize: 11 },
    failReason: { fontSize: 11, marginTop: 4 },
    retryBtn: { padding: 8, borderRadius: 8, alignSelf: 'center', marginLeft: 4 },
});
