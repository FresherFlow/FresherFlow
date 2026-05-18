import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { alpha, theme } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';
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
        <SurfaceCard style={styles.card}>
            <View style={styles.cardRow}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.platformLabel, { color: theme.colors.primary }]}>{item.platform}</Text>
                    {item.opportunity && (
                        <Text style={[styles.oppTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {item.opportunity.company} · {item.opportunity.title}
                        </Text>
                    )}
                    <View style={styles.metaRow}>
                        <View style={[styles.statusChip, { backgroundColor: alpha(meta.color, 0.08) }]}>
                            <Text style={[styles.statusChipText, { color: meta.color }]}>{item.status}</Text>
                        </View>
                        <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                            {item.publishedAt
                                ? new Date(item.publishedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : `Updated ${new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                        </Text>
                    </View>
                    {item.externalPostId ? (
                        <Text style={[styles.externalId, { color: theme.colors.textMuted }]} numberOfLines={1}>Post ID: {item.externalPostId}</Text>
                    ) : null}
                    {item.errorMessage ? (
                        <Text style={[styles.failReason, { color: theme.colors.error }]} numberOfLines={2}>⚠ {item.errorMessage}</Text>
                    ) : null}
                </View>
                {item.status === 'FAILED' && (
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: theme.colors.error, opacity: isRetrying ? 0.6 : 1 }]}
                        onPress={() => onRetry(item.id)}
                        disabled={isRetrying}
                    >
                        {isRetrying ? <ActivityIndicator size="small" color={theme.colors.background} /> : <RefreshCw size={14} color={theme.colors.background} />}
                    </TouchableOpacity>
                )}
            </View>
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        marginBottom: SPACING.md 
    },
    cardRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        gap: SPACING.md 
    },
    statusDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        marginTop: 6 
    },
    platformLabel: { 
        fontSize: mScale(11), 
        fontWeight: '900', 
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 2 
    },
    oppTitle: { 
        fontSize: mScale(15), 
        fontWeight: '900', 
        letterSpacing: -0.5,
        marginBottom: 6 
    },
    metaRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        marginTop: 4 
    },
    statusChip: { 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: RADIUS.md 
    },
    statusChipText: { 
        fontSize: mScale(9), 
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    metaText: { 
        fontSize: mScale(11), 
        fontWeight: '600',
        flexShrink: 1 
    },
    externalId: { 
        fontSize: mScale(11), 
        fontWeight: '500',
        marginTop: 6,
        opacity: 0.7 
    },
    failReason: { 
        fontSize: mScale(11), 
        fontWeight: '700',
        marginTop: 6 
    },
    retryBtn: { 
        width: mScale(36),
        height: mScale(36),
        borderRadius: RADIUS.md, 
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center', 
        marginLeft: 4 
    },
});


