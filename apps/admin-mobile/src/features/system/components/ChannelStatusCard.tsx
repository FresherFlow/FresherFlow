import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Megaphone, MessageSquareWarning, Send, Share2 } from 'lucide-react-native';

import type { FeedbackAlerts, SocialPostSummary, TelegramBroadcastSummary } from '@fresherflow/api-client';
import { useTheme } from '../../../theme/ThemeProvider';

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
    const { colors } = useTheme();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Megaphone size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Channel Status</Text>
            </View>

            <View style={[
                styles.card, 
                { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border 
                }
            ]}>
                <TouchableOpacity style={styles.row} onPress={onOpenFeedback}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.error + '14' }]}>
                        <MessageSquareWarning size={16} color={colors.error} />
                    </View>
                    <View style={styles.body}>
                        <Text style={[styles.label, { color: colors.text }]}>Feedback Queue</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                            {feedbackAlerts
                                ? `${feedbackAlerts.total} fresh items · ${feedbackAlerts.listingCount} listing · ${feedbackAlerts.appCount} app`
                                : 'No feedback snapshot available'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity style={styles.row} onPress={onOpenTelegram}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '14' }]}>
                        <Send size={16} color={colors.secondary} />
                    </View>
                    <View style={styles.body}>
                        <Text style={[styles.label, { color: colors.text }]}>Telegram</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                            {telegramSummary
                                ? `${telegramSummary.sent} sent · ${telegramSummary.failed} failed · ${telegramSummary.skipped} skipped`
                                : 'No Telegram summary available'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity style={styles.row} onPress={onOpenSocial}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.accent + '14' }]}>
                        <Share2 size={16} color={colors.accent} />
                    </View>
                    <View style={styles.body}>
                        <Text style={[styles.label, { color: colors.text }]}>Social Posting</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>
                            {socialSummary
                                ? `${socialSummary.published} published · ${socialSummary.failed} failed · ${socialSummary.pending} pending`
                                : 'No social posting summary available'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: {
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    iconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: { flex: 1 },
    label: { fontSize: 14, fontWeight: '700' },
    meta: { fontSize: 12, marginTop: 2, lineHeight: 17 },
    divider: { height: 1 },
});
