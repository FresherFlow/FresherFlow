import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { alpha } from '../../../theme';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { LinearGradient } from 'expo-linear-gradient';

export interface HeroCardProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    accent?: string;
    style?: StyleProp<ViewStyle>;
}

export const HeroCard = ({ title, subtitle, children, accent, style }: HeroCardProps) => {
    const { currentTheme } = useTheme();
    const heroAccent = accent || currentTheme.colors.primary;

    return (
        <View
            style={[
                styles.heroCard,
                {
                    borderColor: alpha(heroAccent, 0.15),
                    backgroundColor: currentTheme.colors.surface,
                    borderRadius: RADIUS.lg,
                },
                style
            ]}
        >
            <LinearGradient
                colors={[alpha(heroAccent, 0.1), alpha(heroAccent, 0)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
                <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                {subtitle ? (
                    <Text style={[styles.heroSubtitle, { color: currentTheme.colors.textMuted }]}>
                        {subtitle}
                    </Text>
                ) : null}
                {children}
            </View>
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
    style?: StyleProp<ViewStyle>;
}

export const MetricCard = ({ label, value, icon, accent, style }: MetricCardProps) => {
    const { currentTheme } = useTheme();
    const cardAccent = accent || currentTheme.colors.primary;

    return (
        <View style={[
            styles.metricCard, 
            { 
                backgroundColor: alpha(cardAccent, 0.05), 
                borderColor: alpha(cardAccent, 0.1),
                borderRadius: RADIUS.md
            }, 
            style
        ]}>
            <View style={[styles.iconBox, { backgroundColor: alpha(cardAccent, 0.1) }]}>
                {icon}
            </View>
            <View style={styles.metricText}>
                <Text style={[styles.valText, { color: currentTheme.colors.text }]}>{value}</Text>
                <Text style={[styles.labText, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    heroCard: {
        width: '100%',
        borderWidth: 1,
        overflow: 'hidden',
    },
    heroContent: {
        padding: SPACING.lg,
    },
    heroTitle: {
        fontSize: mScale(22),
        fontWeight: '900',
    },
    heroSubtitle: {
        fontSize: mScale(13),
        fontWeight: '500',
        marginTop: 2,
    },
    metricCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        borderWidth: 1,
        gap: SPACING.lg,
    },
    iconBox: {
        width: mScale(32),
        height: mScale(32),
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricText: {
        flex: 1,
    },
    valText: {
        fontSize: mScale(17),
        fontWeight: '800',
    },
    labText: {
        fontSize: mScale(10),
        fontWeight: '700',
        textTransform: 'uppercase',
        opacity: 0.7,
    }
});
