import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { profileApi } from '@fresherflow/api-client';
import { getProfilePageState, PROFILE_BOOST_DAYS } from '@fresherflow/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
    username?: string | null;
    publishedAt?: Date | string | null;
    onActivated?: () => void | Promise<void>;
}

/**
 * Mobile mirror of the web public page card.
 *
 * Publishing is permanent, so nothing here can take the link away: the card exists to sell
 * the booster window, which puts the profile in the recruiter directory for
 * PROFILE_BOOST_DAYS and is invisible to app users without it.
 */
export const PublicPageCard: React.FC<Props> = ({ username, publishedAt, onActivated }) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    // Local override so the status flips the moment activation succeeds.
    const [activatedAt, setActivatedAt] = useState<Date | null | undefined>(undefined);
    const [isActivating, setIsActivating] = useState(false);
    const [failed, setFailed] = useState(false);

    if (!username) return null;

    const state = getProfilePageState(activatedAt !== undefined ? activatedAt : publishedAt ?? null);
    const { status, daysLeft } = state;

    const headline =
        status === 'draft' ? 'Not published yet'
            : status === 'live' ? `Live · boosted for ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
                : status === 'lapsing' ? `Boost ends in ${daysLeft <= 1 ? 'less than a day' : `${daysLeft} days`}`
                    : 'Live · boost ended';

    const body =
        status === 'draft'
            ? `Publish to make fresherflow.in/u/${username} work when you share it. The link then stays online for good, and recruiters see you for ${PROFILE_BOOST_DAYS} days.`
            : status === 'live'
                ? `fresherflow.in/u/${username} is live and boosted. Recruiters find you near the top of their directory.`
                : status === 'lapsing'
                    ? 'Re-boost to stay near the top of the recruiter directory. Your link keeps working either way.'
                    : `Your page is still online and the link still works — you have just dropped out of the recruiter directory. Re-boost for another ${PROFILE_BOOST_DAYS} days.`;

    const cta =
        status === 'draft' ? 'Publish my page'
            : status === 'lapsing' ? 'Re-boost now'
                : `Re-boost for ${PROFILE_BOOST_DAYS} days`;

    const onPress = async () => {
        if (isActivating) return;
        setIsActivating(true);
        setFailed(false);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await profileApi.publishProfile();
            setActivatedAt(new Date());
            await onActivated?.();
        } catch {
            setFailed(true);
        } finally {
            setIsActivating(false);
        }
    };

    const statusColor = status === 'live' ? colors.success : status === 'lapsing' ? colors.warning : colors.textMuted;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text }]}>Public page</Text>
                <Text style={[styles.status, { color: statusColor }]}>{headline}</Text>
            </View>

            <Text style={[styles.url, { color: colors.textMuted }]}>fresherflow.in/u/{username}</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>

            {failed && (
                <Text style={[styles.body, { color: colors.error }]}>
                    Could not activate. Check your connection and try again.
                </Text>
            )}

            <TouchableOpacity
                onPress={onPress}
                disabled={isActivating}
                activeOpacity={0.85}
                style={[styles.button, { backgroundColor: colors.primary, opacity: isActivating ? 0.6 : 1 }]}
            >
                {isActivating ? (
                    <ActivityIndicator color={colors.inverseText} size="small" />
                ) : (
                    <Text style={[styles.buttonLabel, { color: colors.inverseText }]}>{cta}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
    },
    status: {
        fontSize: 12,
        fontWeight: '700',
    },
    url: {
        fontSize: 12,
        fontVariant: ['tabular-nums'],
    },
    body: {
        fontSize: 12,
        lineHeight: 18,
    },
    button: {
        marginTop: 4,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonLabel: {
        fontSize: 13,
        fontWeight: '800',
    },
});
