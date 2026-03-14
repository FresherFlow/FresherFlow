import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, Play } from 'lucide-react-native';
import { theme } from '../../theme';

interface LinkHealthCardProps {
    stats: { healthy: number; broken: number; retrying: number } | null;
    runningVerify: boolean;
    onVerify: () => void;
}

export const LinkHealthCard = ({ stats, runningVerify, onVerify }: LinkHealthCardProps) => {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Link size={16} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Link Health</Text>
            </View>
            <View style={styles.card}>
                <View style={styles.statRow}>
                    {([
                        ['Healthy', stats?.healthy ?? 0, theme.colors.success],
                        ['Broken', stats?.broken ?? 0, theme.colors.error],
                        ['Retrying', stats?.retrying ?? 0, theme.colors.accent],
                    ] as [string, number, string][]).map(([label, val, color]) => (
                        <View key={label} style={[styles.statBadge, { backgroundColor: color + '15' }]}>
                            <Text style={[styles.statNum, { color }]}>{val}</Text>
                            <Text style={styles.statLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity 
                    style={[styles.runBtn, runningVerify && { opacity: 0.6 }]} 
                    onPress={onVerify} 
                    disabled={runningVerify}
                >
                    {runningVerify ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Play size={16} color="#fff" />
                            <Text style={styles.runBtnText}>Run Verification Bot</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statBadge: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600', marginTop: 2 },
    runBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 10,
        backgroundColor: theme.colors.primary
    },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
