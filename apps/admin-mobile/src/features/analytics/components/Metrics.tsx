import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTheme } from '../../../theme';
import { mScale, SPACING } from '../../../theme/dimensions';

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
    const { colors } = useTheme();
    
    const valueColor = tone === 'positive' ? colors.success : tone === 'negative' ? colors.error : colors.text;
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    metricGrid: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: SPACING.md 
    },
    detailRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: SPACING.md, 
        paddingVertical: SPACING.md 
    },
    detailLabel: { 
        fontSize: mScale(14), 
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    detailValue: { 
        fontSize: mScale(15), 
        fontWeight: '800',
        letterSpacing: -0.3,
    },
});
