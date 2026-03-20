import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { alpha } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import { Card } from '@repo/ui';

export const SurfaceCard = Card;

export const HeroCard = ({
    title,
    subtitle,
    accent,
    children,
}: {
    title: string;
    subtitle?: string;
    accent?: string;
    children?: React.ReactNode;
}) => {
    const { colors, sizes, typography } = useTheme();
    const heroAccent = accent ?? colors.primary;

    return (
        <View
            style={[
                styles.heroCard,
                {
                    borderRadius: sizes.card.xl.borderRadius,
                    borderColor: alpha(heroAccent, 0.4),
                    backgroundColor: colors.surface,
                    padding: sizes.card.xl.padding,
                },
            ]}
        >
            <View style={[styles.heroGlow, { backgroundColor: alpha(heroAccent, 0.25) }]} />
            <Text style={[typography.title1, { color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[typography.body, { color: colors.textMuted, marginTop: sizes.card.md.gap }]}>{subtitle}</Text> : null}
            {children}
        </View>
    );
};

export const MetricCard = ({
    label,
    value,
    meta,
    accent,
    icon,
    onPress,
}: {
    label: string;
    value: string | number;
    meta?: string;
    accent?: string;
    icon?: React.ReactNode;
    onPress?: () => void;
}) => {
    const { colors, sizes, typography } = useTheme();
    const cardAccent = accent ?? colors.primary;

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={[
                styles.metricCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: alpha(cardAccent, 0.4),
                    borderRadius: sizes.card.md.borderRadius,
                    padding: sizes.card.md.padding,
                    paddingLeft: sizes.card.md.padding + 4, // More padding for the accent bar
                },
            ]}
        >
            <View 
                style={[
                    styles.accentBar, 
                    { 
                        backgroundColor: cardAccent,
                        borderTopLeftRadius: sizes.card.md.borderRadius,
                        borderBottomLeftRadius: sizes.card.md.borderRadius,
                    }
                ]} 
            />
            <View style={[styles.metricHeader, { gap: sizes.card.sm.gap }]}>
                <Text style={[typography.eyebrow, { color: colors.textMuted }]}>{label}</Text>
                {icon}
            </View>
            <Text style={[typography.title1, { color: colors.text, marginTop: sizes.card.sm.gap }]}>{value}</Text>
            {meta ? <Text style={[typography.footnote, { color: colors.textMuted, marginTop: sizes.card.sm.gap }]}>{meta}</Text> : null}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    heroCard: {
        overflow: 'hidden',
        borderWidth: 1.5,
        position: 'relative',
    },
    heroGlow: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        right: -80,
        top: -100,
    },
    metricCard: {
        width: '48%',
        borderWidth: 1.5,
        minHeight: 110,
        position: 'relative',
        overflow: 'hidden',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
