import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Zap, Play } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';

interface AlertsControlCardProps {
    runningAlerts: boolean;
    onRunAlerts: () => void;
    runningBackfill: boolean;
    onRunBackfill: () => void;
    runningRefresh: boolean;
    onRefreshMetrics: () => void;
}

export const AlertsControlCard = ({
    runningAlerts, onRunAlerts,
    runningBackfill, onRunBackfill,
    runningRefresh, onRefreshMetrics
}: AlertsControlCardProps) => {
    const { colors } = useTheme();

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Zap size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Alerts</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardDesc, { color: colors.textMuted }]}>Manually trigger the alerts dispatch cycle for scheduled jobs.</Text>
                
                <RunBtn loading={runningAlerts} onPress={onRunAlerts} label="Run Alerts Cycle" color={colors.secondary} />
                <View style={{ height: 8 }} />
                <RunBtn loading={runningBackfill} onPress={onRunBackfill} label="Backfill New-Job Alerts (72h)" color={colors.accent} />
                <View style={{ height: 8 }} />
                <RunBtn loading={runningRefresh} onPress={onRefreshMetrics} label="Refresh Metrics Cache" color={colors.textMuted} />
            </View>
        </View>
    );
};

const RunBtn = ({ loading, onPress, label, color }: { loading: boolean; onPress: () => void; label: string; color?: string }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity 
            style={[styles.runBtn, { backgroundColor: color ?? colors.primary }, loading && { opacity: 0.6 }]} 
            onPress={onPress} 
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <>
                    <Play size={16} color="#fff" />
                    <Text style={styles.runBtnText}>{label}</Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: { borderRadius: 14, padding: 16, borderWidth: 1 },
    cardDesc: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
    runBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 10,
    },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
