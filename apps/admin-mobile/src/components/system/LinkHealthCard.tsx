import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, Play } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';

interface LinkHealthCardProps {
    stats: { healthy: number; broken: number; retrying: number } | null;
    runningVerify: boolean;
    onVerify: () => void;
}

export const LinkHealthCard = ({ stats, runningVerify, onVerify }: LinkHealthCardProps) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Link size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Link Health</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statRow}>
                    {([
                        ['Healthy', stats?.healthy ?? 0, colors.success],
                        ['Broken', stats?.broken ?? 0, colors.error],
                        ['Retrying', stats?.retrying ?? 0, colors.accent],
                    ] as [string, number, string][]).map(([label, val, color]) => (
                        <View key={label} style={[styles.statBadge, { backgroundColor: alpha(color, 0.08) }]}>
                            <Text style={[styles.statNum, { color }]}>{val}</Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity 
                    style={[styles.runBtn, { backgroundColor: colors.primary }, runningVerify && { opacity: 0.6 }]} 
                    onPress={onVerify} 
                    disabled={runningVerify}
                >
                    {runningVerify ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <>
                            <Play size={16} color={colors.white} />
                            <Text style={[styles.runBtnText, { color: colors.white }]}>Run Verification Bot</Text>
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
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: { borderRadius: 14, padding: 16, borderWidth: 1 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statBadge: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
    runBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 10,
    },
    runBtnText: { fontWeight: '700', fontSize: 14 },
});
