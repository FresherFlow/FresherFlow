import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, CheckCircle, XCircle } from 'lucide-react-native';
import { theme } from '../../theme';

interface ConfigHealth {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
}

interface ConfigHealthCardProps {
    health: ConfigHealth | null;
}

export const ConfigHealthCard = ({ health }: ConfigHealthCardProps) => {
    if (!health) return null;

    const StatusIcon = ({ ok }: { ok: boolean }) =>
        ok ? <CheckCircle size={16} color={theme.colors.success} /> : <XCircle size={16} color={theme.colors.error} />;

    const formatKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Shield size={16} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Config Health</Text>
            </View>
            <View style={styles.card}>
                {([
                    ['Readiness', health.ready],
                    ['Environment', health.env],
                    ['Database', health.db],
                ] as [string, Record<string, boolean>][]).map(([label, entries], i) => (
                    <React.Fragment key={label}>
                        <Text style={[styles.subheading, i > 0 && { marginTop: 16 }]}>{label}</Text>
                        {Object.entries(entries).map(([k, v]) => (
                            <View key={k} style={styles.checkRow}>
                                <StatusIcon ok={Boolean(v)} />
                                <Text style={styles.checkLabel}>{formatKey(k)}</Text>
                            </View>
                        ))}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    subheading: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    checkLabel: { fontSize: 14, color: theme.colors.text, flex: 1 },
});
