import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { TelegramBroadcast } from '@fresherflow/api-client';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

interface BroadcastCardProps {
    item: TelegramBroadcast;
    isRetrying: boolean;
    onRetry: (id: string) => void;
}

export const BroadcastCard = ({ item, isRetrying, onRetry }: BroadcastCardProps) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    const STATUS_COLORS: Record<string, string> = {
        SENT: colors.success,
        FAILED: colors.error,
        PENDING: colors.secondary,
        RETRY: colors.warning,
    };

    const statusColor = STATUS_COLORS[item.status] ?? colors.secondary;
    
    return (
        <SurfaceCard style={styles.card}>
            <View style={styles.content}>
                <View style={styles.main}>
                    <View style={styles.header}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.status}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                            {item.sentAt
                                ? new Date(item.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                : '—'}
                        </Text>
                    </View>

                    {item.opportunity && (
                        <Text style={[styles.oppTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.opportunity.company} · {item.opportunity.title}
                        </Text>
                    )}

                    <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.message}
                    </Text>

                    {(item.failureReason || (item as { errorMessage?: string }).errorMessage) && (
                        <View style={[styles.errorBox, { backgroundColor: alpha(colors.error, 0.05) }]}>
                            <AlertCircle size={12} color={colors.error} />
                            <Text style={[styles.errorText, { color: colors.error }]} numberOfLines={1}>
                                {item.failureReason ?? (item as { errorMessage?: string }).errorMessage}
                            </Text>
                        </View>
                    )}
                </View>

                {item.status === 'FAILED' && (
                    <TouchableOpacity 
                        style={[styles.retryBtn, { backgroundColor: alpha(colors.error, 0.1) }]} 
                        onPress={() => onRetry(item.id)} 
                        disabled={isRetrying}
                        activeOpacity={0.7}
                    >
                        {isRetrying ? (
                            <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                            <RefreshCw size={16} color={colors.error} />
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        padding: SPACING.md,
        paddingHorizontal: SPACING.lg,
        marginBottom: 8,
    },
    content: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: SPACING.md 
    },
    main: { 
        flex: 1 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    statusDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3 
    },
    statusText: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: mScale(9),
        fontWeight: '700',
        marginLeft: 'auto',
    },
    oppTitle: { 
        fontSize: mScale(15), 
        fontWeight: '900', 
        letterSpacing: -0.5,
        marginBottom: 4 
    },
    message: { 
        fontSize: mScale(12), 
        fontWeight: '500',
        lineHeight: 18,
        opacity: 0.8
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    errorText: {
        fontSize: mScale(10),
        fontWeight: '700',
        flex: 1,
    },
    retryBtn: { 
        width: mScale(40),
        height: mScale(40),
        borderRadius: RADIUS.md,
        alignItems: 'center', 
        justifyContent: 'center',
    },
});
