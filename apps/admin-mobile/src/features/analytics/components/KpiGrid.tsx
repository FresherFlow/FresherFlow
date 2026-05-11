import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { theme } from '../../../theme';

interface KpiCardProps {
    label: string;
    value: number;
    suffix?: string;
    accent: string;
}

export const KpiCard = ({ label, value, suffix, accent }: KpiCardProps) => {
    const compact = false;
    return (
        <View style={[styles.kpiCard, compact && styles.kpiCardCompact, { borderTopColor: accent }]}>
            <Text style={[styles.kpiValue, compact && styles.kpiValueCompact]}>{value.toLocaleString()}{suffix ?? ''}</Text>
            <Text style={[styles.kpiLabel, compact && styles.kpiLabelCompact]}>{label}</Text>
        </View>
    );
};

export const KpiGrid = ({ children }: { children: React.ReactNode }) => {
    const compact = false;
    return (
        <View style={[styles.kpiGrid, compact && styles.kpiGridCompact]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10, marginBottom: 4 },
    kpiGridCompact: { gap: 8 },
    kpiCard: {
        width: '30%', flexGrow: 1,
        backgroundColor: theme.colors.surface, borderRadius: 12,
        padding: 12, borderTopWidth: 3, borderWidth: 1, borderColor: theme.colors.border,
    },
    kpiCardCompact: { padding: 10, borderRadius: 10 },
    kpiValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
    kpiValueCompact: { fontSize: 18 },
    kpiLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },
    kpiLabelCompact: { fontSize: 10, marginTop: 1 },
});


