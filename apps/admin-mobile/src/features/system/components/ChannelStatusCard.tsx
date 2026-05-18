import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageSquareWarning, Send, Share2 } from 'lucide-react-native';
import type { FeedbackAlerts, SocialPostSummary, TelegramBroadcastSummary } from '@fresherflow/api-client';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

type Props = {
    feedbackAlerts: FeedbackAlerts | null;
    telegramSummary: TelegramBroadcastSummary | null;
    socialSummary: SocialPostSummary | null;
    onOpenFeedback: () => void;
    onOpenTelegram: () => void;
    onOpenSocial: () => void;
};

export const ChannelStatusCard = ({
    feedbackAlerts,
    telegramSummary,
    socialSummary,
    onOpenFeedback,
    onOpenTelegram,
    onOpenSocial,
}: Props) => {
    const { currentTheme } = useTheme();

    return (
        <SurfaceCard style={styles.card}>
            <StatusRow 
                icon={<MessageSquareWarning size={16} color={currentTheme.colors.error} />}
                label="Feedback Queue"
                onPress={onOpenFeedback}
                meta={feedbackAlerts
                    ? `${feedbackAlerts.total} fresh · ${feedbackAlerts.listingCount} listings`
                    : 'No feedback snapshot'}
                accent={currentTheme.colors.error}
            />

            <View style={[styles.divider, { backgroundColor: currentTheme.colors.border }]} />

            <StatusRow 
                icon={<Send size={16} color={currentTheme.colors.secondary} />}
                label="Telegram Broadcast"
                onPress={onOpenTelegram}
                meta={telegramSummary
                    ? `${telegramSummary.sent} sent · ${telegramSummary.failed} failed`
                    : 'No Telegram summary'}
                accent={currentTheme.colors.secondary}
            />

            <View style={[styles.divider, { backgroundColor: currentTheme.colors.border }]} />

            <StatusRow 
                icon={<Share2 size={16} color={currentTheme.colors.primary} />}
                label="Social Distribution"
                onPress={onOpenSocial}
                meta={socialSummary
                    ? `${socialSummary.published} published · ${socialSummary.pending} pending`
                    : 'No social summary'}
                accent={currentTheme.colors.primary}
            />
        </SurfaceCard>
    );
};

const StatusRow = ({ icon, label, meta, onPress, accent }: { icon: React.ReactNode, label: string, meta: string, onPress: () => void, accent: string }) => {
    const { currentTheme } = useTheme();
    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: alpha(accent, 0.1) }]}>
                {icon}
            </View>
            <View style={styles.body}>
                <Text style={[styles.label, { color: currentTheme.colors.text }]}>{label}</Text>
                <Text style={[styles.meta, { color: currentTheme.colors.textMuted }]}>{meta}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 0,
        overflow: 'hidden',
    },
    row: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: SPACING.md, 
        padding: SPACING.lg 
    },
    iconWrap: {
        width: mScale(38),
        height: mScale(38),
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { flex: 1 },
    label: { 
        fontSize: mScale(14), 
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    meta: { 
        fontSize: mScale(11), 
        fontWeight: '600',
        marginTop: 2, 
    },
    divider: { 
        height: 1, 
        marginHorizontal: SPACING.lg,
    },
});
