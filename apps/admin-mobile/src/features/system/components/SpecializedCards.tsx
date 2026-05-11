import React from 'react';
import { StyleSheet, Text, View, Pressable, ViewStyle, StyleProp } from 'react-native';
import { alpha } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import { Card } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';

export interface HeroCardProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    accent?: string;
}

export const HeroCard = ({ title, subtitle, children, accent }: HeroCardProps) => {
    const { colors, typography } = useTheme();
    const heroAccent = accent || colors.primary;

    return (
        <View
            style={[
                styles.heroCard,
                {
                    borderColor: alpha(heroAccent, 0.15),
                    backgroundColor: colors.surface,
                    padding: SPACING.lg,
                    borderRadius: RADIUS.xl,
                },
            ]}
        >
            <View style={[styles.heroGlow, { backgroundColor: alpha(heroAccent, 0.25) }]} />
            <Text style={[typography.title1, { fontSize: mScale(22), color: colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[typography.body, { fontSize: mScale(14), color: colors.textMuted, marginTop: SPACING.xs }]}>{subtitle}</Text> : null}
            {children}
        </View>
    );
};

export interface MetricCardProps {
    label: string;
    value: string | number;
    meta?: string;
    icon?: React.ReactNode;
    accent?: string;
    onPress?: () => void;
}

export const MetricCard = ({ label, value, meta, icon, accent, onPress }: MetricCardProps) => {
    const { colors, typography } = useTheme();
    const cardAccent = accent || colors.primary;

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={[
                styles.metricCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: alpha(cardAccent, 0.15),
                    borderRadius: RADIUS.lg,
                    padding: SPACING.md,
                    paddingLeft: SPACING.md + 4, // More padding for the accent bar
                },
            ]}
        >
            <View 
                style={[
                    styles.accentBar, 
                    { 
                        backgroundColor: cardAccent,
                        borderTopLeftRadius: RADIUS.lg,
                        borderBottomLeftRadius: RADIUS.lg,
                    }
                ]} 
            />
            <View style={[styles.metricHeader, { gap: SPACING.xs }]}>
                <Text style={[typography.eyebrow, { fontSize: mScale(10), color: colors.textMuted }]}>{label}</Text>
                {icon}
            </View>
            <Text style={[typography.title1, { fontSize: mScale(20), color: colors.text, marginTop: SPACING.xs }]}>{value}</Text>
            {meta ? <Text style={[typography.footnote, { fontSize: mScale(11), color: colors.textMuted, marginTop: SPACING.xs }]}>{meta}</Text> : null}
        </Pressable>
    );
};

export const SurfaceCard = ({ 
    children, 
    style, 
    onPress 
}: { 
    children: React.ReactNode; 
    style?: StyleProp<ViewStyle>; 
    onPress?: () => void;
}) => {
    const { colors } = useTheme();
    
    return (
        <Pressable onPress={onPress} disabled={!onPress}>
            <Card 
                style={[
                    { 
                        backgroundColor: colors.surface, 
                        borderRadius: RADIUS.lg,
                        borderWidth: 0.5,
                        borderColor: alpha(colors.border, 0.4),
                        padding: SPACING.md,
                    }, 
                    style
                ]}
            >
                {children}
            </Card>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    heroCard: {
        width: '100%',
        borderWidth: 0.5,
        overflow: 'hidden',
        position: 'relative',
    },
    heroGlow: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.5,
        transform: [{ scale: 2 }],
    },
    metricCard: {
        flex: 1,
        borderWidth: 0.5,
        minWidth: 150,
        position: 'relative',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
