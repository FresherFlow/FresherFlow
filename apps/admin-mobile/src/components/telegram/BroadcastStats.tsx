import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface BroadcastStatsProps {
    sent: number;
    failed: number;
    pending: number;
    total: number;
}

export const BroadcastStats = ({ sent, failed, pending, total }: BroadcastStatsProps) => {
    return (
        <View style={styles.statsBanner}>
            <StatPill label="Sent" value={sent} color={theme.colors.success} />
            <StatPill label="Failed" value={failed} color={theme.colors.error} />
            <StatPill label="Pending" value={pending} color={theme.colors.accent} />
            <StatPill label="Total" value={total} color={theme.colors.primary} />
        </View>
    );
};

const StatPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.pill, { backgroundColor: color + '15' }]}>
        <Text style={[styles.pillNum, { color }]}>{value}</Text>
        <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    statsBanner: { 
        flexDirection: 'row', 
        gap: 8, 
        padding: 12, 
        backgroundColor: theme.colors.surface, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.colors.border 
    },
    pill: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    pillNum: { fontSize: 18, fontWeight: '800' },
    pillLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
});
