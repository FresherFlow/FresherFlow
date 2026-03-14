import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Zap, Play } from 'lucide-react-native';
import { theme } from '../../theme';

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
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Zap size={16} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Alerts</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.cardDesc}>Manually trigger the alerts dispatch cycle for scheduled jobs.</Text>
                
                <RunBtn loading={runningAlerts} onPress={onRunAlerts} label="Run Alerts Cycle" color={theme.colors.secondary} />
                <View style={{ height: 8 }} />
                <RunBtn loading={runningBackfill} onPress={onRunBackfill} label="Backfill New-Job Alerts (72h)" color={theme.colors.accent} />
                <View style={{ height: 8 }} />
                <RunBtn loading={runningRefresh} onPress={onRefreshMetrics} label="Refresh Metrics Cache" color={theme.colors.textMuted} />
            </View>
        </View>
    );
};

const RunBtn = ({ loading, onPress, label, color }: { loading: boolean; onPress: () => void; label: string; color?: string }) => (
    <TouchableOpacity 
        style={[styles.runBtn, { backgroundColor: color ?? theme.colors.primary }, loading && { opacity: 0.6 }]} 
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

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    cardDesc: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 14, lineHeight: 18 },
    runBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 10,
    },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
