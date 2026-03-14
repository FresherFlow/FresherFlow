import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { theme } from '../../theme';

interface KpiCardProps {
    label: string;
    value: number;
    suffix?: string;
    accent: string;
}

export const KpiCard = ({ label, value, suffix, accent }: KpiCardProps) => (
    <View style={[styles.kpiCard, { borderTopColor: accent }]}>
        <Text style={styles.kpiValue}>{value.toLocaleString()}{suffix ?? ''}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
    </View>
);

export const KpiGrid = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.kpiGrid}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10, marginBottom: 4 },
    kpiCard: {
        width: '30%', flexGrow: 1,
        backgroundColor: theme.colors.surface, borderRadius: 12,
        padding: 12, borderTopWidth: 3, borderWidth: 1, borderColor: theme.colors.border,
    },
    kpiValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
    kpiLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
});
