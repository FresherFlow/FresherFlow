import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';

interface BroadcastStatsProps {
    sent: number;
    failed: number;
    skipped: number;
    total: number;
}

export const BroadcastStats = ({ sent, failed, skipped, total }: BroadcastStatsProps) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.statsBanner, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <StatPill label="Sent" value={sent} color={colors.success} />
            <StatPill label="Failed" value={failed} color={colors.error} />
            <StatPill label="Skipped" value={skipped} color={colors.accent} />
            <StatPill label="Total" value={total} color={colors.primary} />
        </View>
    );
};

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.pill, { backgroundColor: color + '12' }]}>
            <Text style={[styles.pillNum, { color }]}>{value}</Text>
            <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    statsBanner: { 
        flexDirection: 'row', 
        gap: 8, 
        padding: 12, 
        borderBottomWidth: 1, 
    },
    pill: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    pillNum: { fontSize: 18, fontWeight: '800' },
    pillLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
