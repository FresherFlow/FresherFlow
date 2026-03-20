import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { theme } from '../../../theme';
import type { SocialPost } from '@fresherflow/api-client';

interface SocialPostCardProps {
    item: SocialPost;
    isRetrying: boolean;
    onRetry: (id: string) => void;
}

const STATUS_META: Record<SocialPost['status'], { color: string }> = {
    PUBLISHED: { color: theme.colors.success },
    FAILED: { color: theme.colors.error },
    PENDING: { color: theme.colors.accent },
    DISABLED: { color: theme.colors.textMuted },
    DRY_RUN: { color: theme.colors.secondary },
};

export const SocialPostCard = ({ item, isRetrying, onRetry }: SocialPostCardProps) => {
    const meta = STATUS_META[item.status];

    return (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.platformLabel}>{item.platform}</Text>
                    {item.opportunity && (
                        <Text style={styles.oppTitle} numberOfLines={1}>
                            {item.opportunity.title} · {item.opportunity.company}
                        </Text>
                    )}
                    <View style={styles.metaRow}>
                        <View style={[styles.statusChip, { backgroundColor: meta.color + '20' }]}>
                            <Text style={[styles.statusChipText, { color: meta.color }]}>{item.status}</Text>
                        </View>
                        <Text style={styles.metaText}>
                            {item.publishedAt
                                ? new Date(item.publishedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : `Updated ${new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                        </Text>
                    </View>
                    {item.externalPostId ? (
                        <Text style={styles.externalId} numberOfLines={1}>Post ID: {item.externalPostId}</Text>
                    ) : null}
                    {item.errorMessage ? (
                        <Text style={styles.failReason} numberOfLines={2}>⚠ {item.errorMessage}</Text>
                    ) : null}
                </View>
                {item.status === 'FAILED' && (
                    <TouchableOpacity
                        style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]}
                        onPress={() => onRetry(item.id)}
                        disabled={isRetrying}
                    >
                        {isRetrying ? <ActivityIndicator size="small" color="#fff" /> : <RefreshCw size={14} color="#fff" />}
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
    platformLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, marginBottom: 2 },
    oppTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    statusChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    statusChipText: { fontSize: 10, fontWeight: '800' },
    metaText: { fontSize: 11, color: theme.colors.textMuted, flexShrink: 1 },
    externalId: { fontSize: 11, color: theme.colors.textMuted, marginTop: 4 },
    failReason: { fontSize: 11, color: theme.colors.error, marginTop: 4 },
    retryBtn: { backgroundColor: theme.colors.secondary, padding: 8, borderRadius: 8, alignSelf: 'center', marginLeft: 4 },
});


