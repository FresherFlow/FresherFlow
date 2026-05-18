import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';
import { AppButton } from '@repo/ui';

interface LinkHealthCardProps {
    stats: { healthy: number; broken: number; retrying: number } | null;
    runningVerify: boolean;
    onVerify: () => void;
}

export const LinkHealthCard = ({ stats, runningVerify, onVerify }: LinkHealthCardProps) => {
    const { currentTheme } = useTheme();

    return (
        <SurfaceCard style={styles.card}>
            <View style={styles.statRow}>
                {[
                    ['Healthy', stats?.healthy ?? 0, currentTheme.colors.success],
                    ['Broken', stats?.broken ?? 0, currentTheme.colors.error],
                    ['Retrying', stats?.retrying ?? 0, currentTheme.colors.secondary],
                ].map(([label, val, color]) => (
                    <View key={label as string} style={[styles.statBadge, { backgroundColor: alpha(color as string, 0.05) }]}>
                        <Text style={[styles.statNum, { color: color as string }]}>{val}</Text>
                        <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>{String(label).toUpperCase()}</Text>
                    </View>
                ))}
            </View>
            
            <AppButton
                label="Run Verification Engine"
                onPress={onVerify}
                loading={runningVerify}
                icon={<Play size={16} color={currentTheme.colors.background} />}
                style={styles.runBtn}
            />
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        padding: SPACING.lg 
    },
    statRow: { 
        flexDirection: 'row', 
        gap: SPACING.sm, 
        marginBottom: SPACING.lg 
    },
    statBadge: { 
        flex: 1, 
        borderRadius: RADIUS.md, 
        padding: SPACING.md, 
        alignItems: 'center' 
    },
    statNum: { 
        fontSize: mScale(22), 
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statLabel: { 
        fontSize: mScale(9), 
        fontWeight: '900', 
        letterSpacing: 1,
        marginTop: 4 
    },
    runBtn: {
        height: mScale(48),
        borderRadius: RADIUS.md,
    },
});
