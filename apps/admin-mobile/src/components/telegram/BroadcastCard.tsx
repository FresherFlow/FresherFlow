import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { theme } from '../../theme';
import type { TelegramBroadcast } from '../../lib/api';

interface BroadcastCardProps {
    item: TelegramBroadcast;
    isRetrying: boolean;
    onRetry: (id: string) => void;
}

const STATUS_META: Record<string, { color: string }> = {
    SENT: { color: theme.colors.success },
    FAILED: { color: theme.colors.error },
    PENDING: { color: theme.colors.accent },
    RETRY: { color: theme.colors.secondary },
};

export const BroadcastCard = ({ item, isRetrying, onRetry }: BroadcastCardProps) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
    
    return (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <View style={{ flex: 1 }}>
                    {item.opportunity && (
                        <Text style={styles.oppTitle} numberOfLines={1}>
                            {item.opportunity.title} · {item.opportunity.company}
                        </Text>
                    )}
                    <Text style={styles.msgPreview} numberOfLines={3}>{item.message}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.statusChip, { backgroundColor: meta.color + '20' }]}>
                            <Text style={[styles.statusChipText, { color: meta.color }]}>{item.status}</Text>
                        </View>
                        <Text style={styles.metaText}>
                            {item.sentAt
                                ? new Date(item.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : item.scheduledAt
                                    ? `Scheduled: ${new Date(item.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                                    : 'Not sent'}
                        </Text>
                    </View>
                    {(item.failureReason || item.errorMessage) && (
                        <Text style={styles.failReason} numberOfLines={2}>
                            ⚠ {item.failureReason ?? item.errorMessage}
                        </Text>
                    )}
                </View>
                {item.status === 'FAILED' && (
                    <TouchableOpacity 
                        style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]} 
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
    card: { backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    oppTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
    msgPreview: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    statusChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    statusChipText: { fontSize: 10, fontWeight: '800' },
    metaText: { fontSize: 11, color: theme.colors.textMuted },
    failReason: { fontSize: 11, color: theme.colors.error, marginTop: 4 },
    retryBtn: { backgroundColor: theme.colors.secondary, padding: 8, borderRadius: 8, alignSelf: 'center', marginLeft: 4 },
});
