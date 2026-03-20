import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useUITheme } from '../../../theme';

export const MetricGrid = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.metricGrid}>{children}</View>
);

export const DetailRow = ({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string | number;
    tone?: 'default' | 'positive' | 'negative';
}) => {
    const { colors } = useUITheme();
    const valueColor = tone === 'positive' ? colors.success : tone === 'negative' ? colors.error : colors.text;
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 14 },
    detailLabel: { fontSize: 15, fontWeight: '600' },
    detailValue: { fontSize: 15, fontWeight: '800' },
});
